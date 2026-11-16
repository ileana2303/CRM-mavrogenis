/**
 * ΑΑΔΕ «Αναζήτηση Βασικών Στοιχείων Μητρώου Επιχειρήσεων» (RgWsPublic2, SOAP 1.2) – same client as ranty.gr.
 * `GSIS_USERNAME` / `GSIS_PASSWORD` are the «Ειδικοί Κωδικοί» of Diagnostic Equipment's own ΑΦΜ (never TAXISnet's).
 * No sandbox; each call counts against that ΑΦΜ's monthly limit, and the person looked up sees who asked in their TAXISnet.
 */

const ENDPOINT = 'https://www1.gsis.gr/wsaade/RgWsPublic2/RgWsPublic2';
const TIMEOUT_MS = 15_000;

/** What the register says about an ΑΦΜ, shaped for the billing form. */
export type AfmInfo = {
  afm: string;
  legalName: string;
  /** The distinctive title, when it differs from the legal name. */
  commercialTitle: string | null;
  taxOffice: string;
  profession: string;
  address: string;
  postalCode: string;
  city: string;
  /** «ΦΠ» in the register: a natural person, whose onomasia reads «ΕΠΩΝΥΜΟ ΟΝΟΜΑ …». */
  person: boolean;
  /** False for an ΑΦΜ the register marks as closed. */
  active: boolean;
};

/** The register's answers that mean «no such business», not an outage: a wrong number, or one that never was a business. */
const NOT_FOUND = new Set(['RG_WS_PUBLIC_WRONG_AFM', 'RG_WS_PUBLIC_EPIT_NF']);

export const afmLookupConfigured = (): boolean => Boolean(process.env.GSIS_USERNAME && process.env.GSIS_PASSWORD);

const escapeXml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const unescapeXml = (value: string) =>
  value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');

export function afmRequest(afm: string, username: string, password: string): string {
  return `<env:Envelope xmlns:env="http://www.w3.org/2003/05/soap-envelope" xmlns:ns1="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" xmlns:ns2="http://rgwspublic2/RgWsPublic2Service" xmlns:ns3="http://rgwspublic2/RgWsPublic2"><env:Header><ns1:Security><ns1:UsernameToken><ns1:Username>${escapeXml(username)}</ns1:Username><ns1:Password>${escapeXml(password)}</ns1:Password></ns1:UsernameToken></ns1:Security></env:Header><env:Body><ns2:rgWsPublic2AfmMethod><ns2:INPUT_REC><ns3:afm_called_by/><ns3:afm_called_for>${escapeXml(afm)}</ns3:afm_called_for></ns2:INPUT_REC></ns2:rgWsPublic2AfmMethod></env:Body></env:Envelope>`;
}

/** An element's text, whatever its prefix; '' when empty or `xsi:nil`. These answers hold no nesting of the same name. */
const textOf = (xml: string, name: string): string => {
  const match = new RegExp(`<(?:[\\w-]+:)?${name}(?:\\s[^>]*)?>([^<]*)</(?:[\\w-]+:)?${name}>`).exec(xml);
  return match ? unescapeXml(match[1]).replace(/\s+/g, ' ').trim() : '';
};

/** Null when the register knows no such business; throws on anything else that is not an answer. */
export function parseAfmResponse(xml: string): AfmInfo | null {
  const fault = textOf(xml, 'Text') || textOf(xml, 'faultstring');
  const code = textOf(xml, 'error_code');
  if (code) {
    if (NOT_FOUND.has(code)) return null;
    throw new Error(`gsis ${code}: ${textOf(xml, 'error_descr')}`);
  }
  const afm = textOf(xml, 'afm');
  if (!afm) throw new Error(`gsis: ${fault || 'no data in the answer'}`);
  const legalName = textOf(xml, 'onomasia');
  const title = textOf(xml, 'commer_title');
  // The main activity, «ΚΥΡΙΑ», whichever order they come in.
  const activities = xml.match(/<(?:[\w-]+:)?item(?:\s[^>]*)?>[\s\S]*?<\/(?:[\w-]+:)?item>/g) ?? [];
  const main = activities.find((item) => textOf(item, 'firm_act_kind') === '1') ?? activities[0] ?? '';
  return {
    afm,
    legalName,
    commercialTitle: title && title !== legalName ? title : null,
    taxOffice: textOf(xml, 'doy_descr'),
    profession: textOf(main, 'firm_act_descr'),
    // A number of 0 means the register has none.
    address: [textOf(xml, 'postal_address'), textOf(xml, 'postal_address_no')].filter((part) => part && part !== '0').join(' '),
    postalCode: textOf(xml, 'postal_zip_code'),
    city: textOf(xml, 'postal_area_description'),
    person: textOf(xml, 'i_ni_flag_descr') === 'ΦΠ',
    active: textOf(xml, 'deactivation_flag') === '1',
  };
}

/** Null when the register knows no such ΑΦΜ; throws on bad codes or an outage. */
export async function lookupAfm(afm: string): Promise<AfmInfo | null> {
  const username = process.env.GSIS_USERNAME;
  const password = process.env.GSIS_PASSWORD;
  if (!username || !password) throw new Error('gsis: not configured');
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/soap+xml; charset=utf-8' },
    body: afmRequest(afm, username, password),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: 'no-store',
  });
  return parseAfmResponse(await response.text());
}
