import axios from "axios";
import { Router } from "express";
import { RedisCache } from '../utils/cache';

const router = Router();

// Function to issue an AnonCred credential
async function issueAnonCredCredential(
  payload: any,
  connectionId: string
): Promise<any> {
  try {
    const apiUrl = process.env.API_ENDPOINT + "/credential/anoncred/offer";
    const apiKey = process.env.HOVI_API_KEY;
    const tenantId = process.env.TENANT_ID;
    const credentialTemplateId = process.env.CREDENTIAL_TEMPLATE_ID;

    const data = {
      connectionId: connectionId,
      credentialTemplateId: credentialTemplateId,
      credentialValues: payload,
      comment: "vAI Demo Credential",
    };

    const headers = {
      "x-tenant-id": tenantId,
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };

    const response = await axios.post(apiUrl, data, { headers });

    return response.data;
  } catch (error: any) {
    console.error(
      "Error issuing AnonCred credential:",
      error.response?.data || error.message
    );
    throw new Error("Failed to issue AnonCred credential");
  }
}

// Function to create a connection
async function createConnection(): Promise<any> {
  try {
    const apiUrl = process.env.API_ENDPOINT + "/connection/create";
    const apiKey = process.env.HOVI_API_KEY;
    const tenantId = process.env.TENANT_ID;
    const data = {
      label: "Acme Financial Group",
      alias: "fg", //ADD AGENT INVITE URL
      autoAcceptConnection: true,
      multiUseInvitation: false,
      domain: "acme-financial-group.com",
      imageUrl:
        "https://hovi-assets.s3.eu-central-1.amazonaws.com/studio-assets/tenants/images/acme-financial-group-image-1744552187457.jpeg",
    };
    const headers = {
      "x-tenant-id": tenantId,
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };
    const response = await axios.post(apiUrl, data, { headers });

    return response.data;
  } catch (error: any) {
    console.error(
      "Error creating connection:",
      error.response?.data || error.message
    );
    throw new Error("Failed to create connection");
  }
}

// Function to get connection details
async function getConnectionDetails(invitationId: string): Promise<any> {
  try {
    const apiUrl =
      process.env.API_ENDPOINT +
      "/connection/find?invitationId=" +
      invitationId;
    const apiKey = process.env.HOVI_API_KEY;
    const tenantId = process.env.TENANT_ID;
    const headers = {
      "x-tenant-id": tenantId,
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };
    const response = await axios.get(apiUrl, { headers });
    return response.data;
  } catch (error: any) {
    console.error(
      "Error getting connection details:",
      error.response?.data || error.message
    );
    throw new Error("Failed to get connection details");
  }
}

// Use BlandAI API to make a phone call
async function makePhoneCall(phone_number: string, connection_id: string): Promise<any> {
  try {
    if (!process.env.BLAND_AI_API_KEY || !process.env.BLAND_AI_PATHWAY) {
      throw new Error(
        "Missing BLAND_AI_API_KEY or BLAND_AI_PATHWAY in environment variables"
      );
    }

    const options = {
      method: "POST",
      headers: {
        authorization: process.env.BLAND_AI_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone_number: phone_number,
        pathway_id: process.env.BLAND_AI_PATHWAY,
        voice: "June",
        background_track: "office",
        max_duration: 2,
        from: "+14159808590"
      }),
    };

    fetch("https://api.bland.ai/v1/calls", options)
      .then((response) => {
        if (response.status !== 200) {
          throw new Error("Error making phone call");
        }
        console.log("Response:", response);

        RedisCache.setValue(
          `phone_call_${phone_number}`,
          { status: "active",
            connection_id: connection_id
           },
          60 * 5
        ); // Store the phone call status in Redis for 5 mins

        return response.json();
      })
      .catch((err) => console.error(err));
  } catch (error: any) {
    console.error(
      "Error making phone call:",
      error.response?.data || error.message
    );
    throw new Error("Failed to make phone call");
  }
}


const extractProofValues = (jsonData: any) => {
  const extracted: Record<string, string> = {};

  try {
    const revealedGroups = jsonData.presentationExchange.presentation.anoncreds.requested_proof.revealed_attr_groups;    

    if (revealedGroups?.attributes?.values) {
      const values = revealedGroups.attributes.values;

      for (const key in values) {
        if (values[key]?.raw) {
          extracted[key] = values[key].raw;
        }
      }
    }
  } catch (error) {
    // console.error('Error extracting proof values:', error);    
  }

  return extracted;
};
  

async function verifyDIDLinkedResources(issuerDid: string, credDefId: string) {
  const API_KEY = process.env.CHEQD_API_KEY;
  const url = `https://studio-api.cheqd.net/resource/search/${issuerDid}`;

  // Extract the resource ID from the credDefId
  const credDefResourceId = credDefId.split("/").pop();

  const params = {
    resourceId: credDefResourceId,
  };

  return await axios
    .get(url, {
      headers: {
        accept: "json/",
        "x-api-key": API_KEY,
      },
      params,
    });
}

const sendAndCheckProofDuringCall = async (phone_number: string) => {
    const verificationTemplateId = process.env.VERIFICATION_TEMPLATE_ID;
    const call_data = await RedisCache.getValue(
      `phone_call_${phone_number}`);

    if (!call_data) {
      console.error("No call data found in Redis");
      return null;
    }     
    
    console.log("Call data:", call_data);
    const connectionId = call_data.connection_id;

    const token = process.env.HOVI_API_KEY;
    const tenantId = process.env.TENANT_ID;
    const headers = {
        "x-tenant-id": tenantId,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

    try {
      // Step 1: Send proof request
      const sendRes = await axios.post( process.env.API_ENDPOINT +'/verification/send-proof-request', {
        verificationTemplateId,
        connectionId,
        comment: 'verifying identification during call',
      }, { headers });
  
      const proofExchangeId = sendRes.data.response.proofExchangeId;
      console.log('✅ Sent proof request:', proofExchangeId);
  
      //Step 2: Poll every 2s for up to 2 minutes
      const start = Date.now();
      const timeout = 2 * 60 * 1000;
      var i = 0;
      while (Date.now() - start < timeout) {
        console.log("\n⏳ Polling for proof response..."+ i + " with id: " + proofExchangeId);
        i++;
        const pollRes = await axios.get(
          `${process.env.API_ENDPOINT}/verification/proof-request/find?proofExchangeId=${proofExchangeId}`,
          { headers }
        );
        console.log("Poll response:", pollRes.data);
        const proof = pollRes.data.response;
        if (proof && proof.isVerified && proof.state === "done") {
          let credData = extractProofValues(proof);

          
          const identifiers = proof.presentationExchange.presentation.anoncreds.identifiers?.[0];
          console.log("Identifiers:", identifiers);

          const credDefId = identifiers.cred_def_id || "";
          const issuerDid = process.env.ISSUER_DID;

          console.log("v2",credDefId);
          console.log("v3",issuerDid);
      
            // verifying did-linked resource
        if (issuerDid && credDefId) {
            let didLinkedResp = await verifyDIDLinkedResources(issuerDid, credDefId);        
            if (didLinkedResp.status === 200) {
                console.log("dis-linked data", didLinkedResp.data);
            } else {
                console.error("Error verifying DID-linked resources:", didLinkedResp);
                return null;
            }


          RedisCache.setValue(
            `phone_call_${phone_number}`,
            { status: "proof_verified",
              connection_id: connectionId,
              cred_data: credData
             },
            60 * 5
          ); // Store the phone call status in Redis for 5 mins

          console.log('🎉 Proof response received:', credData);
          return credData;
        }

        if (proof && proof.state === "abandonded") {
          console.log('❌ Proof request abandoned');
          return null;
        }


  
        await new Promise(res => setTimeout(res, 2000));
      }
  
      console.warn('⌛ Timed out waiting for proof');
      return null;        
    } catch (err) {
      console.error('❌ Error:', err);
      return null;
    }
  };



  async function fetchvAiProofRequests() {
    const TOKEN = process.env.HOVI_API_KEY;
    const TENANT_ID = process.env.AGENT_TENANT_ID;
    if (!TOKEN) {
        throw new Error("API key is not set");
    }
    if (!TENANT_ID) {
        throw new Error("Tenant ID is not set");
    }
  const response = await fetch(`${process.env.API_ENDPOINT}/verification/proof-request?state=pending`, {
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

async function submitvAiPresentation(proofExchangeId: string) {
  const TOKEN = process.env.HOVI_API_KEY;
  const TENANT_ID = process.env.AGENT_TENANT_ID;
    if (!TOKEN) {
        throw new Error("API key is not set");
    }
    if (!TENANT_ID) {
        throw new Error("Tenant ID is not set");
    }
  const response = await fetch(`${process.env.API_ENDPOINT}/verification/submit-presentation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-tenant-id": TENANT_ID,
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({ "proofRecordId": proofExchangeId }),
  });

  const json = await response.json();
//   console.log(`✅ Submitted presentation for ${proofRecordId}`);
  return json;
}

async function rejectvAiProofRequest(proofExchangeId: string) {
  const TOKEN = process.env.HOVI_API_KEY;
  const TENANT_ID = process.env.AGENT_TENANT_ID;
    if (!TOKEN) {
        throw new Error("API key is not set");
    }
    if (!TENANT_ID) {
        throw new Error("Tenant ID is not set");
    }
  const response = await fetch(`${process.env.API_ENDPOINT}/verification/decline-request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-tenant-id": TENANT_ID,
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({ "proofExchangeId:": proofExchangeId })
  });
  const json = await response.json();
  return json
}


async function processvAiProofRequests(phoneNumber: string) {
  const proofRequests = await fetchvAiProofRequests();
  let vAI_STATUS = "pending";
  for (const proofRequest of proofRequests) {
    const proofExchangeId = proofRequest.proofExchangeId;    
    console.log(`Processing proof exchange ID: ${proofExchangeId}`);

    const call_data = await RedisCache.getValue(
      `phone_call_${phoneNumber}`);

    if (!call_data) {
      console.log("No active call data found, rejecting proof request");
      const result = await rejectvAiProofRequest(proofExchangeId);
      vAI_STATUS = "rejected";      
    }     else {
      const result = await submitvAiPresentation(proofExchangeId);      
      console.log(`Result for ${proofExchangeId}:`, result);
      vAI_STATUS = "verified";
    }
  }
  return vAI_STATUS;
}

// API endpoint to create a connection
router.post("/create-connection", async (req, res) => {
  try {
    const connectionData = await createConnection();
    res.status(200).json(connectionData);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to get connection details
router.get("/connection/:invitationId", async (req, res) => {
  const invitationId = req.params.invitationId;
  try {
    const connectionDetails = await getConnectionDetails(invitationId);
    res.status(200).json(connectionDetails);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to issue an AnonCred credential
router.post("/issue-credential", async (req, res) => {
  const credentialData = req.body.credentialValues;
  const connectionId = req.body.connectionId;
  try {
    const credential = await issueAnonCredCredential(
      credentialData,
      connectionId
    );
    res.status(200).json(credential);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to make a phone call
router.post("/make-phone-call", async (req, res) => {
    const phoneNumber = req.body.phone_number;
    const connectionId = req.body.connection_id;
    try {
        const response = await makePhoneCall(phoneNumber, connectionId);
        res.status(200).json(response);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

//API endpoint to send and check proof during call
router.post("/send-proofreq-during-call", async (req, res) => {
  console.log("body", req.body);
    const phoneNumber = req.body.to;
    try {
        const response = await sendAndCheckProofDuringCall(phoneNumber);
        res.status(200).json(response);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}
);

//API route to get credential information from Redis
router.get("/get-credential-info/:phone_number", async (req, res) => {
    const phoneNumber = req.params.phone_number;
    try {
        const credentialInfo = await RedisCache.getValue(`phone_call_${phoneNumber}`);
        if (credentialInfo && credentialInfo.cred_data) {
            res.status(200).json(credentialInfo.cred_data);
        } else {
            res.status(404).json({ message: "No credential information found" });
        }
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

//API route to process vAI proof requests
router.get("/get-vai-status/:phone_number", async (req, res) => {   
  const phoneNumber = req.params.phone_number; 
    try {
        const status = await processvAiProofRequests(phoneNumber);
        res.status(200).json({ "status": status });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}
);


router.get("/status", async (req, res) => {
  try {
    console.log("Status route here");
    res.status(200).json({ status: true });
  } catch (error) {
    console.error("Error getting status:", error);
    res.status(500).json({ error: "Failed to get status" });
  }
});


export default router;
