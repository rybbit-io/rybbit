import { HttpMethod } from "./endpointConfig";

export interface CodeGenConfig {
  method: HttpMethod;
  url: string;
  queryParams: Record<string, any>;
  body?: any;
  apiKey?: string;
}

function buildQueryString(params: Record<string, any>): string {
  const filtered = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  );
  if (filtered.length === 0) return "";
  return (
    "?" +
    filtered
      .map(([k, v]) => {
        // For arrays and plain objects, JSON.stringify before encoding
        const value =
          Array.isArray(v) || (typeof v === "object" && v !== null)
            ? JSON.stringify(v)
            : String(v);
        return `${encodeURIComponent(k)}=${encodeURIComponent(value)}`;
      })
      .join("&")
  );
}

function formatJsonForCode(obj: any, indent: number = 2): string {
  return JSON.stringify(obj, null, indent);
}

export function generateCurl(config: CodeGenConfig): string {
  const { method, url, queryParams, body, apiKey = "YOUR_API_KEY" } = config;
  const queryString = buildQueryString(queryParams);
  const fullUrl = `${url}${queryString}`;

  let curl = `curl -X ${method} "${fullUrl}" \\
  -H "Authorization: Bearer ${apiKey}"`;

  if (body && (method === "POST" || method === "PUT")) {
    curl += ` \\
  -H "Content-Type: application/json" \\
  -d '${formatJsonForCode(body)}'`;
  }

  return curl;
}

export function generateJavaScript(config: CodeGenConfig): string {
  const { method, url, queryParams, body, apiKey = "YOUR_API_KEY" } = config;
  const queryString = buildQueryString(queryParams);
  const fullUrl = `${url}${queryString}`;

  if (method === "GET" || !body) {
    return `const response = await fetch(
  '${fullUrl}',
  {
    headers: {
      'Authorization': 'Bearer ${apiKey}'
    }
  }
);

const data = await response.json();`;
  }

  return `const response = await fetch(
  '${fullUrl}',
  {
    method: '${method}',
    headers: {
      'Authorization': 'Bearer ${apiKey}',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(${formatJsonForCode(body, 4)})
  }
);

const data = await response.json();`;
}

export function generatePython(config: CodeGenConfig): string {
  const { method, url, queryParams, body, apiKey = "YOUR_API_KEY" } = config;

  const paramsStr =
    Object.keys(queryParams).length > 0
      ? `\n    params=${formatJsonForCode(queryParams, 8)},`
      : "";

  if (method === "GET") {
    return `import requests

response = requests.get(
    '${url}',${paramsStr}
    headers={
        'Authorization': 'Bearer ${apiKey}'
    }
)

data = response.json()`;
  }

  const methodLower = method.toLowerCase();
  const bodyStr = body ? `\n    json=${formatJsonForCode(body, 8)},` : "";

  return `import requests

response = requests.${methodLower}(
    '${url}',${paramsStr}${bodyStr}
    headers={
        'Authorization': 'Bearer ${apiKey}'
    }
)

data = response.json()`;
}

export function generatePHP(config: CodeGenConfig): string {
  const { method, url, queryParams, body, apiKey = "YOUR_API_KEY" } = config;
  const queryString = buildQueryString(queryParams);
  const fullUrl = `${url}${queryString}`;

  if (method === "GET" || !body) {
    return `$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, '${fullUrl}');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ${apiKey}'
]);

$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);`;
  }

  // Escape for PHP single-quoted string: backslashes first, then single quotes
  const escapedBody = formatJsonForCode(body)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'");

  return `$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, '${fullUrl}');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, '${method}');
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ${apiKey}',
    'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, '${escapedBody}');

$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);`;
}

export function generateRuby(config: CodeGenConfig): string {
  const { method, url, queryParams, body, apiKey = "YOUR_API_KEY" } = config;
  const queryString = buildQueryString(queryParams);
  const fullUrl = `${url}${queryString}`;

  if (method === "GET" || !body) {
    return `require 'net/http'
require 'json'

uri = URI('${fullUrl}')
req = Net::HTTP::Get.new(uri)
req['Authorization'] = 'Bearer ${apiKey}'

res = Net::HTTP.start(uri.hostname, uri.port, use_ssl: true) { |http| http.request(req) }
data = JSON.parse(res.body)`;
  }

  const reqClass = method === "POST" ? "Post" : method === "PUT" ? "Put" : "Delete";
  return `require 'net/http'
require 'json'

uri = URI('${fullUrl}')
req = Net::HTTP::${reqClass}.new(uri)
req['Authorization'] = 'Bearer ${apiKey}'
req['Content-Type'] = 'application/json'
req.body = ${formatJsonForCode(body)}.to_json

res = Net::HTTP.start(uri.hostname, uri.port, use_ssl: true) { |http| http.request(req) }
data = JSON.parse(res.body)`;
}

export function generateGo(config: CodeGenConfig): string {
  const { method, url, queryParams, body, apiKey = "YOUR_API_KEY" } = config;
  const queryString = buildQueryString(queryParams);
  const fullUrl = `${url}${queryString}`;

  if (method === "GET" || !body) {
    return `req, _ := http.NewRequest("${method}", "${fullUrl}", nil)
req.Header.Set("Authorization", "Bearer ${apiKey}")

client := &http.Client{}
resp, _ := client.Do(req)
defer resp.Body.Close()

var data map[string]interface{}
json.NewDecoder(resp.Body).Decode(&data)`;
  }

  return `payload := []byte(\`${formatJsonForCode(body)}\`)
req, _ := http.NewRequest("${method}", "${fullUrl}", bytes.NewBuffer(payload))
req.Header.Set("Authorization", "Bearer ${apiKey}")
req.Header.Set("Content-Type", "application/json")

client := &http.Client{}
resp, _ := client.Do(req)
defer resp.Body.Close()

var data map[string]interface{}
json.NewDecoder(resp.Body).Decode(&data)`;
}

export function generateRust(config: CodeGenConfig): string {
  const { method, url, queryParams, body, apiKey = "YOUR_API_KEY" } = config;
  const queryString = buildQueryString(queryParams);
  const fullUrl = `${url}${queryString}`;
  const methodLower = method.toLowerCase();

  if (method === "GET" || !body) {
    return `let client = reqwest::Client::new();
let res = client
    .${methodLower}("${fullUrl}")
    .header("Authorization", "Bearer ${apiKey}")
    .send()
    .await?;

let data: serde_json::Value = res.json().await?;`;
  }

  return `let client = reqwest::Client::new();
let res = client
    .${methodLower}("${fullUrl}")
    .header("Authorization", "Bearer ${apiKey}")
    .json(&serde_json::json!(${formatJsonForCode(body)}))
    .send()
    .await?;

let data: serde_json::Value = res.json().await?;`;
}

export function generateJava(config: CodeGenConfig): string {
  const { method, url, queryParams, body, apiKey = "YOUR_API_KEY" } = config;
  const queryString = buildQueryString(queryParams);
  const fullUrl = `${url}${queryString}`;

  if (method === "GET" || !body) {
    return `HttpClient client = HttpClient.newHttpClient();
HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("${fullUrl}"))
    .header("Authorization", "Bearer ${apiKey}")
    .GET()
    .build();

HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());`;
  }

  return `HttpClient client = HttpClient.newHttpClient();
HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("${fullUrl}"))
    .header("Authorization", "Bearer ${apiKey}")
    .header("Content-Type", "application/json")
    .method("${method}", HttpRequest.BodyPublishers.ofString("${formatJsonForCode(body).replace(/"/g, '\\"')}"))
    .build();

HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());`;
}

export function generateDotNet(config: CodeGenConfig): string {
  const { method, url, queryParams, body, apiKey = "YOUR_API_KEY" } = config;
  const queryString = buildQueryString(queryParams);
  const fullUrl = `${url}${queryString}`;

  if (method === "GET") {
    return `using var client = new HttpClient();
client.DefaultRequestHeaders.Add("Authorization", "Bearer ${apiKey}");

var response = await client.GetAsync("${fullUrl}");
var data = await response.Content.ReadAsStringAsync();`;
  }

  if (!body) {
    if (method === "DELETE") {
      return `using var client = new HttpClient();
client.DefaultRequestHeaders.Add("Authorization", "Bearer ${apiKey}");

var response = await client.DeleteAsync("${fullUrl}");
var data = await response.Content.ReadAsStringAsync();`;
    }
    const methodName = method === "POST" ? "PostAsync" : "PutAsync";
    return `using var client = new HttpClient();
client.DefaultRequestHeaders.Add("Authorization", "Bearer ${apiKey}");

var response = await client.${methodName}("${fullUrl}", null);
var data = await response.Content.ReadAsStringAsync();`;
  }

  const httpMethod = method === "POST" ? "Post" : method === "PUT" ? "Put" : "Delete";

  return `using var client = new HttpClient();
client.DefaultRequestHeaders.Add("Authorization", "Bearer ${apiKey}");

var content = new StringContent(
    @"${formatJsonForCode(body).replace(/"/g, '""')}",
    Encoding.UTF8,
    "application/json"
);

var request = new HttpRequestMessage(HttpMethod.${httpMethod}, "${fullUrl}")
{
    Content = content
};

var response = await client.SendAsync(request);
var data = await response.Content.ReadAsStringAsync();`;
}

// All generators mapped by language name
export const codeGenerators: Record<string, (config: CodeGenConfig) => string> = {
  cURL: generateCurl,
  JavaScript: generateJavaScript,
  Python: generatePython,
  PHP: generatePHP,
  Ruby: generateRuby,
  Go: generateGo,
  Rust: generateRust,
  Java: generateJava,
  ".NET": generateDotNet,
};

export const languageOrder = [
  "cURL",
  "JavaScript",
  "Python",
  "PHP",
  "Ruby",
  "Go",
  "Rust",
  "Java",
  ".NET",
];
