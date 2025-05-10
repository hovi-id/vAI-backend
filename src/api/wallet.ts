import { Router } from "express";
import { decryptString } from "./crypto";
import axios from "axios";

const router = Router();

async function createWallet(label: string, secret: string) {
  const response = await fetch(
    `${process.env.CLOUD_WALLET_API_ENDPOINT}/wallet/create`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        label,
        secret,
      }),
    }
  );

  const data = await response.json();
  return data;
}

async function getAllConnections(token: string) {
  const response = await fetch(
    `${process.env.CLOUD_WALLET_API_ENDPOINT}/connection`,
    {
      method: "GET",
      headers: {
        Authorization: "Bearer " + token,
      },
    }
  );

  const data = await response.json();
  return data;
}

async function acceptConnection(
  token: string,
  invitationUrl: string,
  label: string
) {
  const response = await fetch(
    `${process.env.CLOUD_WALLET_API_ENDPOINT}/connection/accept-invitation`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({
        invitation: invitationUrl,
        protocol: "didcomm",
        label: label,
      }),
    }
  );

  const data = await response.json();
  return data;
}

async function sendProofRequest(token: string, connectionId: string) {
  const response = await fetch(
    `${process.env.CLOUD_WALLET_API_ENDPOINT}/proof/send-request`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({
        protocol: "didcomm",
        connectionId: connectionId,
        presentationRequestLabel: "AI Agent Verification",
        presentationRequestVersion: "1.0.0",
        requestedAttributes: {
          "0_Attribute": {
            name: "CallerId",
          },
          "1_Attribute": {
            name: "Owner",
          },
          "2_Attribute": {
            name: "Name",
          },
        },
      }),
    }
  );

  const data = await response.json();
  return data;
}

async function getProofRequestStatus(token: string, proofRecordId: string) {
  const response = await fetch(
    `${process.env.CLOUD_WALLET_API_ENDPOINT}/proof/${proofRecordId}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
    }
  );

  const data = await response.json();
  return data;
}

//API to create a new wallet
router.post("/create", async (req, res) => {
  const { phone_number, secret } = req.body;
  try {
    const wallet = await createWallet(phone_number, secret);
    res.status(200).json(wallet);
  } catch (error) {
    console.error("Error creating wallet:", error);
    res.status(500).json({ error: "Failed to create wallet" });
  }
});
//API to get all connections

router.get("/connections", async (req, res) => {
  try {
    const walletSecret = req.query.walletSecret as string;
    const token = req.headers["authorization"]?.split(" ")[1] as string;
    const decryptedToken = await decryptString(token, walletSecret);

    const connections = await getAllConnections(decryptedToken);
    res.status(200).json(connections);
  } catch (error) {
    console.error("Error getting connections:", error);
    res.status(500).json({ error: "Failed to get connections" });
  }
});

//API to accept a connection

router.post("/connections/accept", async (req, res) => {
  const { walletSecret, invitationUrl, label } = req.body;
  try {
    const token = req.headers["authorization"]?.split(" ")[1] as string;
    const decryptedToken = await decryptString(token, walletSecret);

    const connection = await acceptConnection(
      decryptedToken,
      invitationUrl,
      label
    );
    res.status(200).json(connection);
  } catch (error) {
    console.error("Error accepting connection:", error);
    res.status(500).json({ error: "Failed to accept connection" });
  }
});

//API to send a proof request
router.post("/proof/send-request", async (req, res) => {
  const { walletSecret, connectionId } = req.body;
  try {
    const token = req.headers["authorization"]?.split(" ")[1] as string;
    const decryptedToken = await decryptString(token, walletSecret);
    const proofRequest = await sendProofRequest(decryptedToken, connectionId);
    res.status(200).json(proofRequest);
  } catch (error) {
    console.error("Error sending proof request:", error);
    res.status(500).json({ error: "Failed to send proof request" });
  }
});

function parseAnonCreds(json: any) {
  try {
    if (!json?.success || !json.response) return null;

    const requestAttrs = json.response.request.anoncreds.requested_attributes;
    const revealedAttrs =
      json.response.presentation.anoncreds.requested_proof.revealed_attrs;
    const identifiers = json.response.presentation.anoncreds.identifiers?.[0];

    const credDefId = identifiers.cred_def_id || "";
    const schemaId = identifiers.schema_id || "";

    // Extract issuer DID from cred_def_id
    const issuerDid = credDefId.split("/resources/")[0] || "";

    const data: Record<string, string> = {};

    for (const key in revealedAttrs) {
      const attrName = requestAttrs[key]?.name;
      const rawValue = revealedAttrs[key]?.raw;
      if (attrName && rawValue) {
        data[attrName] = rawValue;
      }
    }

    return {
      status: true,
      schemaId: schemaId,
      issuerDid: issuerDid,
      credDefId: credDefId,
      data,
    };
  } catch (error) {
    console.error("Error parsing anon creds:", error);
    return { status: false };
  }
}

async function verifyDIDLinkedResources(issuerDid: string, credDefId: string) {
  const API_KEY = process.env.CHEQD_API_KEY;
  const url = `https://studio-api.cheqd.net/resource/search/${issuerDid}`;

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

//API to get proof request status
router.get("/proof/status", async (req, res) => {
  const walletSecret = req.query.walletSecret as string;
  const proofRecordId = req.query.proofRecordId as string;
  try {
    const token = req.headers["authorization"]?.split(" ")[1] as string;
    const decryptedToken = await decryptString(token, walletSecret);

    const proofStatus = await getProofRequestStatus(
      decryptedToken,
      proofRecordId
    );
    const resp = parseAnonCreds(proofStatus);

    //Verifying DID-Linked Resources
    if (!resp) {
        res.status(400).json({ error: "Invalid proof status response" });
        return
    }
    const issuerDid = resp.issuerDid;
    const credDefId = resp.credDefId;    
    let linkedResResp = await verifyDIDLinkedResources(issuerDid, credDefId);
    if (linkedResResp.status !== 200) {
      res.status(400).json({ error: "Failed to verify linked resources" });
      return;
    }
    const linkedResData = linkedResResp.data;
    console.log("Linked Resources Data:", linkedResData);
    
    res.status(200).json(resp);
  } catch (error) {
    console.error("Error getting proof request status:", error);
    res.status(500).json({ error: "Failed to get proof request status" });
  }
});

router.get("/connectionInvite", async (req, res) => {
  try {
    res.status(200).json({
      inviteUrl:
        "https://studio-dev.hovi.id/connection?oob=eyJAdHlwZSI6Imh0dHBzOi8vZGlkY29tbS5vcmcvb3V0LW9mLWJhbmQvMS4xL2ludml0YXRpb24iLCJAaWQiOiJjYTBjOTE0Ni1lNjc5LTQzOWYtYjAwNS1iOGVhMzI5MjhhY2EiLCJsYWJlbCI6IisxNDE1OTgwODU5MCIsImFjY2VwdCI6WyJkaWRjb21tL2FpcDEiLCJkaWRjb21tL2FpcDI7ZW52PXJmYzE5Il0sImhhbmRzaGFrZV9wcm90b2NvbHMiOlsiaHR0cHM6Ly9kaWRjb21tLm9yZy9kaWRleGNoYW5nZS8xLjEiLCJodHRwczovL2RpZGNvbW0ub3JnL2Nvbm5lY3Rpb25zLzEuMCJdLCJzZXJ2aWNlcyI6W3siaWQiOiIjaW5saW5lLTAiLCJzZXJ2aWNlRW5kcG9pbnQiOiJodHRwczovL2tub3duLW1lbGl0YS1ob3ZpLTQ0NzI2MDc1LmtveWViLmFwcC9hZ2VudCIsInR5cGUiOiJkaWQtY29tbXVuaWNhdGlvbiIsInJlY2lwaWVudEtleXMiOlsiZGlkOmtleTp6Nk1rcWRLR3FFZlB4NEZNRmRTR21mMjZmclhUWVliMU05UmtYbnpoeDRXdjVIWUIiXSwicm91dGluZ0tleXMiOltdfV0sImltYWdlVXJsIjoiaHR0cHM6Ly9ob3ZpLWFzc2V0cy5zMy5ldS1jZW50cmFsLTEuYW1hem9uYXdzLmNvbS9zdHVkaW8tYXNzZXRzL3RlbmFudHMvaW1hZ2VzL2FjbWUtY2FsbGVyLWFnZW50LWltYWdlLTE3NDQ1NTU2OTk4MzUucG5nIn0",
    });
  } catch (error) {
    console.error("Error getting status:", error);
    res.status(500).json({ error: "Failed to get status" });
  }
});

//API to get status of api
router.get("/status", async (req, res) => {
  try {
    console.log("wallet endpoint hit");
    res.status(200).json({ status: true });
  } catch (error) {
    console.error("Error getting status:", error);
    res.status(500).json({ error: "Failed to get status" });
  }
});

export default router;
