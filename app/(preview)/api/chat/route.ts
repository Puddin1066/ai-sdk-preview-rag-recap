import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { fetchRecapCases, formatCasesForContext } from "@/lib/recap";
import fs from 'fs';
import path from 'path';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    
    // Get the user's latest message for RECAP search
    const userMessage = messages[messages.length - 1].content;
    console.log('Processing query:', userMessage);
    
    // Extract key search terms from the user's message
    const searchTerms = userMessage
      .toLowerCase()
      .split(' ')
      .filter((word: string) => word.length > 3) // Remove short words
      .filter((word: string) => !['analyze', 'legal', 'precedents', 'risks', 'around', 'common', 'patterns', 'factors', 'consider', 'recent', 'trends', 'jurisdictional', 'considerations', 'impact', 'status'].includes(word)) // Remove generic terms
      .concat(['medical', 'device', 'product', 'liability']) // Add specific terms
      .slice(0, 5) // Take first 5 words
      .join(' ');
    
    console.log('Extracted search terms:', searchTerms);
    
    // Fetch cases from RECAP
    console.log('Fetching cases from RECAP...');
    let relevantCases: Array<{
      title: string;
      date: string;
      summary: string;
      url: string;
      court: string;
      citations: string;
      judge: string;
      docketNumber: string;
      status: string;
      citeCount: number;
      cites: number[];
      courtCitationString: string;
      downloadUrl: string;
      suitNature: string;
      type: string;
    }> = [];
    try {
      // First try with specific medical device terms
      relevantCases = await fetchRecapCases('medical device product liability defective');
      console.log(`Found ${relevantCases.length} relevant cases with medical device search`);
      
      // If no cases found, try broader search
      if (relevantCases.length === 0) {
        relevantCases = await fetchRecapCases('medical device liability');
        console.log(`Found ${relevantCases.length} relevant cases with broader search`);
      }
      
      // If still no cases, try the original search terms
      if (relevantCases.length === 0) {
        relevantCases = await fetchRecapCases(searchTerms);
        console.log(`Found ${relevantCases.length} relevant cases with original search terms`);
      }
    } catch (error) {
      console.error('Error fetching cases:', error);
      relevantCases = [];
    }
    
    // Debug: Validate relevantCases
    console.log('=== RELEVANT CASES VALIDATION ===');
    console.log('Number of cases:', relevantCases.length);
    if (relevantCases.length > 0) {
      console.log('First case structure:', JSON.stringify(relevantCases[0], null, 2));
      console.log('Case titles:', relevantCases.map(c => c.title));
      console.log('Case dates:', relevantCases.map(c => c.date));
      console.log('Case courts:', relevantCases.map(c => c.court));
      console.log('Case types:', relevantCases.map(c => c.type));
      console.log('Case suit nature:', relevantCases.map(c => c.suitNature));
    } else {
      console.log('No cases found with any search strategy');
    }
    
    // Format the cases into a string for GPT context
    const casesContext = formatCasesForContext(relevantCases);
    
    // Debug: Validate casesContext
    console.log('=== CASES CONTEXT VALIDATION ===');
    console.log('Context length:', casesContext.length);
    console.log('Context preview (first 500 chars):', casesContext.substring(0, 500));
    console.log('Context contains case titles:', relevantCases.every(c => casesContext.includes(c.title)));
    console.log('Context contains case dates:', relevantCases.every(c => casesContext.includes(c.date)));
    console.log('Context contains case courts:', relevantCases.every(c => casesContext.includes(c.court)));
    console.log('Context contains case types:', relevantCases.every(c => casesContext.includes(c.type)));
    console.log('Context contains case suit nature:', relevantCases.every(c => casesContext.includes(c.suitNature)));

    // Combine analytical framework with case context
    const augmentedMessages = [
      {
        role: "system",
        content: `You are a legal research assistant specializing in medical device product liability cases. Your task is to analyze the following court cases and provide insights based on the data provided.

RELEVANT CASES FROM RECAP:
${casesContext}

ANALYSIS REQUIREMENTS:

1. CASE ANALYSIS FRAMEWORK:
   - For each case, identify:
     * The specific medical device involved
     * The type of liability claim (design defect, manufacturing defect, failure to warn)
     * The court's jurisdiction and level
     * Key legal issues and holdings
     * Procedural history and current status

2. PATTERN ANALYSIS:
   - Identify common themes across cases:
     * Types of medical devices most frequently involved
     * Most common types of defects alleged
     * Jurisdictional trends (federal vs. state courts)
     * Settlement patterns and amounts
     * Impact of FDA approval status on outcomes

3. PRACTICAL IMPLICATIONS:
   - For each case, provide:
     * Key takeaways for medical device manufacturers
     * Risk mitigation strategies
     * Best practices for product development and warnings
     * Litigation strategy considerations

4. CITATION ANALYSIS:
   - Analyze the citation network:
     * Most cited cases and why
     * Emerging legal principles
     * Conflicting precedents
     * Recent developments in the law

5. RESPONSE FORMAT:
   - Organize your analysis into sections:
     1. Executive Summary
     2. Case-by-Case Analysis
     3. Pattern Recognition
     4. Practical Implications
     5. Citation Network Analysis
     6. Recommendations

6. DATA VALIDATION:
   - Verify that your analysis includes:
     * Specific case references (titles, dockets, dates)
     * Court citations and holdings
     * Judge names and jurisdictions
     * Procedural history
     * Current status

7. IMPORTANT NOTES:
   - Base all analysis on the actual case data provided
   - Support conclusions with specific case references
   - Highlight any data limitations or gaps
   - Suggest additional search terms if needed
   - Provide actionable insights for legal practice

IMPORTANT: The cases above are real court cases from the CourtListener database. You must analyze them and provide meaningful insights, even if they are not directly on point. If cases are not directly related to medical device liability, explain why they might still be relevant and suggest more specific search terms.`
      },
      ...messages
    ];

    // Debug: Validate augmentedMessages
    console.log('=== AUGMENTED MESSAGES VALIDATION ===');
    console.log('System message length:', augmentedMessages[0].content.length);
    console.log('Contains cases context:', augmentedMessages[0].content.includes(casesContext));
    console.log('Number of messages:', augmentedMessages.length);

    console.log('Sending to GPT with context...');
    const result = streamText({
      model: openai("gpt-4"),
      messages: augmentedMessages,
      temperature: 0.7,
      maxTokens: 2000
    });

    // Convert the stream to a ReadableStream
    const stream = result.toDataStreamResponse();
    
    // Save the response to a log file
    const logFile = path.join(logsDir, `chat-${Date.now()}.log`);
    const writer = fs.createWriteStream(logFile);
    
    // Log the request and response
    writer.write(`Query: ${userMessage}\n\n`);
    writer.write(`Cases: ${JSON.stringify(relevantCases, null, 2)}\n\n`);
    writer.write(`Formatted Cases: ${casesContext}\n\n`);
    
    // Create a new ReadableStream for the response
    const responseStream = new ReadableStream({
      async start(controller) {
        try {
          const reader = stream.body!.getReader();
          let fullResponse = '';
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            // Decode the chunk and add to full response
            const chunk = new TextDecoder().decode(value);
            fullResponse += chunk;
            
            // Write to log file
            writer.write(chunk);
            
            // Enqueue the chunk for streaming
            controller.enqueue(value);
          }
          
          // Log the full response
          writer.write(`\n\nFull Response: ${fullResponse}\n`);
          writer.end();
          controller.close();
        } catch (error) {
          console.error('Error in response stream:', error);
          controller.error(error);
        }
      }
    });
    
    // Return the stream with proper headers
    return new Response(responseStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in chat route:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to process request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
