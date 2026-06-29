async function seed() {
  const API_BASE = "http://localhost:8000/api";
  
  try {
    // 1. Create Environments
    console.log("Creating environments...");
    await fetch(`${API_BASE}/environments/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: "Development",
        variables: [
          { key: "base_url", value: "https://jsonplaceholder.typicode.com", type: "default", initial_value: "https://jsonplaceholder.typicode.com", enabled: true }
        ]
      })
    });
    
    await fetch(`${API_BASE}/environments/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: "Production",
        variables: [
          { key: "base_url", value: "https://httpbin.org", type: "default", initial_value: "https://httpbin.org", enabled: true },
          { key: "api_key", value: "prod-secret-key-123", type: "secret", initial_value: "", enabled: true }
        ]
      })
    });

    // 2. Create Collection
    console.log("Creating collection...");
    const colRes = await fetch(`${API_BASE}/collections/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: "JSONPlaceholder API", description: "Sample requests to test the app." })
    });
    const collection = await colRes.json();
    const colId = collection.id;

    // 3. Create Requests in Collection
    console.log("Creating requests...");
    const reqs = [
      {
        collection_id: colId,
        name: "Get All Posts",
        method: "GET",
        url: "{{base_url}}/posts",
        headers: [], query_params: [], body_type: "none", body: "", auth_type: "none", auth_credentials: {}
      },
      {
        collection_id: colId,
        name: "Create New Post",
        method: "POST",
        url: "{{base_url}}/posts",
        headers: [{ key: "Content-Type", value: "application/json", enabled: true }],
        query_params: [],
        body_type: "raw",
        body: JSON.stringify({ title: "foo", body: "bar", userId: 1 }, null, 2),
        auth_type: "none", auth_credentials: {}
      },
      {
        collection_id: colId,
        name: "Get Single Post with Query",
        method: "GET",
        url: "{{base_url}}/comments",
        headers: [],
        query_params: [{ key: "postId", value: "1", enabled: true }],
        body_type: "none", body: "", auth_type: "none", auth_credentials: {}
      }
    ];

    for (const r of reqs) {
      await fetch(`${API_BASE}/requests/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(r)
      });
    }

    // 4. Generate History via Proxy
    console.log("Generating history...");
    const historyReqs = [
      { method: "GET", url: "https://jsonplaceholder.typicode.com/posts/1", headers: {} },
      { method: "GET", url: "https://httpbin.org/get", headers: {} },
      { method: "POST", url: "https://httpbin.org/post", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ test: "data" }) }
    ];

    for (const h of historyReqs) {
      await fetch(`${API_BASE}/proxy/send`, {
        method: 'POST',
        headers: {
          'x-postman-target-url': h.url,
          'x-postman-target-method': h.method,
          'x-postman-target-headers': JSON.stringify(h.headers),
          ...h.headers
        },
        body: h.body
      });
    }

    console.log("Seeding complete!");
  } catch (err) {
    console.error("Error seeding:", err);
  }
}

seed();
