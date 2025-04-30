const TENANT_ID = process.env.AGENT_TENANT_ID;
const TOKEN = process.env.HOVI_API_KEY;
const API_BASE = process.env.API_ENDPOINT;

async function fetchProofRequests() {
    if (!TOKEN) {
        throw new Error("API key is not set");
    }
    if (!TENANT_ID) {
        throw new Error("Tenant ID is not set");
    }
  const response = await fetch(`${API_BASE}/verification/proof-request?state=pending`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "x-tenant-id": TENANT_ID,
      Authorization: `Bearer ${TOKEN}`,
    },
  });

  const json = await response.json();
  return json.response;
}

async function submitPresentation(proofRecordId: string) {
    if (!TOKEN) {
        throw new Error("API key is not set");
    }
    if (!TENANT_ID) {
        throw new Error("Tenant ID is not set");
    }
  const response = await fetch(`${API_BASE}/verification/submit-presentation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-tenant-id": TENANT_ID,
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({ proofRecordId }),
  });

  const json = await response.json();
//   console.log(`✅ Submitted presentation for ${proofRecordId}`);
  return json;
}

async function initAiAgentProofSubmissionPoll() {
      console.log("🔍 Checking and submitting for pending proof requests every 5 seconds...");
  while (true) {
    try {
    
      const requests = await fetchProofRequests();

      const pending = requests.filter(
        (r: any) => r.state === "pending"
      );

      if (pending.length > 0) {
        console.log(`🟡 Found ${pending.length} pending request(s)`);
      }

      //TODO: fetch phonenumber of user based on connectionId and check in redis for active call

      for (const req of pending) {
        console.log(`🚀 Submitting presentation for proofRecordId: ${req.proofExchangeId}`);
        await submitPresentation(req.proofExchangeId);
      }
      console.log('\n');
      await new Promise((resolve) => setTimeout(resolve, 5000));
    } catch (error) {
      console.error("❌ Error in polling loop:", error);
      console.log("⏳ Restarting loop in 5 seconds...");
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

export { fetchProofRequests, initAiAgentProofSubmissionPoll, submitPresentation };