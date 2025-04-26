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
        voice: "pryce",
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
          { status: "pending",
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

// Function to send to the proof request


const respondAiAgentProofRequest = async () => {
    const apiUrl =  process.env.API_ENDPOINT +'/verification/proof-request';
    const interval = 2000;
    const timeout = 5 * 60 * 1000;
    const startTime = Date.now();

    const apiKey = process.env.HOVI_API_KEY;
    const agentTenantId = process.env.AGENT_TENANT_ID;
    const headers = {
        "x-tenant-id": agentTenantId,
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      };

    if (!apiKey || !agentTenantId || !headers) {
      throw new Error("Missing API key or agent tenant ID in environment variables");
    }
  
    const check = async () => {
      try {        
        const response = await axios.get(apiUrl, { headers });        
        const data = await response.data;
        if (Array.isArray(data.response) && data.response.length > 0) {
          console.log(`🎉 Response for tenant ${agentTenantId}:`, data.response);
          // TODO: Find from which connection the proof request was sent from and if the phone number session is active for it
          // const connectionId = data.response[0].connectionId;          
          // const connectionDetails = await getConnectionDetails(connectionId);          
          // const phone_number = connectionDetails.theirLabel;
          // const callStatus = RedisCache.getValue(`phone_call_${phone_number}`);

          const URL2 = process.env.API_ENDPOINT + '/verification/submit-presentation';
          const payload = { proofRecordId: "PROOF-RECORD-FOUND in data.response" }
          const response2 = await axios.post(URL2, payload, { headers });;      
          const data2 = await response2.data  
          console.log(`🎉 DATA of proof submission:`, data2);

          return true; // Stop polling if the proof request is found
        }
          
        console.log(`⏳ Waiting for tenant ${agentTenantId}...`);
        return false;
  
      } catch (err) {
        console.error(`❌ Error for tenant ${agentTenantId}:`, err);
        return true;     // Stop polling on error
      }
    };
  
    const poll = async () => {
      while (Date.now() - startTime < timeout) {
        const found = await check();
        if (found) break;
        await new Promise(res => setTimeout(res, interval));
      }
  
      console.log(`✅ Polling done for tenant ${agentTenantId}`);
    };
  
    poll();
  };


  const sendAndCheckProofDuringCall = async (phone_number: string) => {
    const verificationTemplateId = process.env.VERIFICATION_TEMPLATE_ID;
    const call_data = await RedisCache.getValue(
      `phone_call_${phone_number}`);

    if (!call_data) {
      console.error("No call data found in Redis");
      return null;
    }     
   
    //TODO: CHECK IF PHONE CALL IS ACTIVE
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
  
      // Step 2: Poll every 2s for up to 2 minutes
      // const start = Date.now();
      // const timeout = 2 * 60 * 1000;
  
      // while (Date.now() - start < timeout) {
      //   const pollRes = await axios.get(
      //     `${process.env.API_ENDPOINT}/verification/proof-request/find?proofExchangeId=${proofExchangeId}`,
      //     { headers }
      //   );
  
      //   const proof = pollRes.data.response;
      //   if (Array.isArray(proof) && proof.length > 0) {
      //     console.log('🎉 Proof response received:', proof);
      //     return proof;
      //   }
  
      //   await new Promise(res => setTimeout(res, 2000));
      // }
  
      // console.warn('⌛ Timed out waiting for proof');
      // return null;
      return sendRes.data.response;
  
    } catch (err) {
      console.error('❌ Error:', err);
      return null;
    }
  };

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

//API endpoint to respond to the proof request
// router.post("/respond-proof-request", async (req, res) => {    
//     try {
//         const response = await respondAiAgentProofRequest();
//         res.status(200).json(response);
//     } catch (error: any) {
//         res.status(500).json({ error: error.message });
//     }
// });

//API endpoint to send and check proof during call
router.post("/send-proofreq-during-call", async (req, res) => {
    const phoneNumber = req.body.phone_number;
    try {
        const response = await sendAndCheckProofDuringCall(phoneNumber);
        res.status(200).json(response);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}
);


export default router;
