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
async function makePhoneCall(phone_number: string): Promise<any> {
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
          { status: "pending" },
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
    try {
        const response = await makePhoneCall(phoneNumber);
        res.status(200).json(response);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
