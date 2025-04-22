// lib/recap.ts

interface RecapCase {
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
}

export async function fetchRecapCases(query: string, limit: number = 5): Promise<RecapCase[]> {
  console.log('COURTLISTENER_API_TOKEN:', process.env.COURTLISTENER_API_TOKEN ? 'Token exists' : 'Token is missing');
  
  console.log(`Fetching cases for query: "${query}" with limit: ${limit}`);
  
  try {
    const url = `https://www.courtlistener.com/api/rest/v3/search/?q=${encodeURIComponent(query)}&type=o&order_by=score desc&format=json&limit=${limit}`;
    console.log(`Making request to: ${url}`);

    const response = await fetch(url, {
      headers: {
        'Authorization': `Token ${process.env.COURTLISTENER_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response body:', errorText);
      throw new Error(`RECAP API error: ${response.status} ${response.statusText}\n${errorText}`);
    }

    const data = await response.json();
    console.log(`Found ${data.results?.length || 0} cases`);

    if (!data.results || !Array.isArray(data.results)) {
      console.error('Unexpected API response format:', data);
      return [];
    }

    const limitedResults = data.results.slice(0, limit);
    console.log(`Returning ${limitedResults.length} cases after limiting`);

    const cases = limitedResults.map((opinion: any) => {
      // Extract citations
      const citations = opinion.citation || [];
      const citationText = citations.length > 0 
        ? citations.join(', ') 
        : opinion.lexisCite || opinion.neutralCite || 'No citation available';

      // Extract summary from snippet or plain_text
      const summary = opinion.snippet 
        ? opinion.snippet.replace(/<mark>.*?<\/mark>/g, '') // Remove highlight markers
        : opinion.plain_text?.slice(0, 1000) 
        || 'No summary available';

      return {
        title: opinion.caseName || opinion.docketNumber || 'Untitled Case',
        date: opinion.dateFiled || opinion.date_created || 'Date unknown',
        summary: summary,
        url: `https://www.courtlistener.com${opinion.absolute_url || ''}`,
        court: opinion.court || opinion.court_citation_string || 'Unknown Court',
        citations: citationText,
        judge: opinion.judge || 'Judge not specified',
        docketNumber: opinion.docketNumber || 'No docket number',
        status: opinion.status || 'Status unknown',
        citeCount: opinion.citeCount || 0,
        cites: opinion.cites || [],
        courtCitationString: opinion.court_citation_string || '',
        downloadUrl: opinion.download_url || '',
        suitNature: opinion.suitNature || '',
        type: opinion.type || ''
      };
    });

    console.log('Processed cases:', cases);
    return cases;

  } catch (error) {
    console.error('Error fetching RECAP cases:', error);
    return [];
  }
}

export function formatCasesForContext(cases: RecapCase[]): string {
  if (!cases || cases.length === 0) {
    return "No relevant cases found.";
  }

  // Group cases by court and date for pattern analysis
  const casesByCourt = cases.reduce((acc, caseData) => {
    const court = caseData.courtCitationString || caseData.court;
    if (!acc[court]) acc[court] = [];
    acc[court].push(caseData);
    return acc;
  }, {} as Record<string, RecapCase[]>);

  let formattedCases = "";

  // Format cases by court
  Object.entries(casesByCourt).forEach(([court, courtCases]) => {
    formattedCases += `\nCOURT: ${court}\n`;
    formattedCases += `CASES: ${courtCases.length}\n\n`;

    courtCases.forEach((caseData, index) => {
      // Clean up the summary
      const cleanSummary = caseData.summary
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 500);

      formattedCases += `CASE ${index + 1}:\n`;
      formattedCases += `TITLE: "${caseData.title}"\n`;
      formattedCases += `CITATION: "${caseData.citations}"\n`;
      formattedCases += `DATE: "${new Date(caseData.date).toLocaleDateString()}"\n`;
      formattedCases += `DOCKET: "${caseData.docketNumber}"\n`;
      formattedCases += `JUDGE: "${caseData.judge}"\n`;
      formattedCases += `STATUS: "${caseData.status}"\n`;
      formattedCases += `TYPE: "${caseData.type}"\n`;
      formattedCases += `CITE_COUNT: ${caseData.citeCount}\n`;
      formattedCases += `CITES: ${caseData.cites.length} cases\n`;
      formattedCases += `SUIT_NATURE: "${caseData.suitNature}"\n`;
      formattedCases += `URL: "${caseData.url}"\n`;
      formattedCases += `DOWNLOAD_URL: "${caseData.downloadUrl}"\n`;
      formattedCases += `SUMMARY: "${cleanSummary}"\n\n`;
    });
  });

  // Add citation network analysis
  const citationCounts = cases.reduce((acc, caseData) => {
    caseData.cites.forEach(citeId => {
      acc[citeId] = (acc[citeId] || 0) + 1;
    });
    return acc;
  }, {} as Record<number, number>);

  const commonCitations = Object.entries(citationCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  formattedCases += "\nCITATION NETWORK ANALYSIS:\n";
  formattedCases += `Most commonly cited cases across all results:\n`;
  commonCitations.forEach(([citeId, count]) => {
    formattedCases += `- Case ID ${citeId}: Cited ${count} times\n`;
  });

  return formattedCases;
}
  