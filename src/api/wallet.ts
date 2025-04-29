import { Router } from "express";
import { decryptString } from "./crypto";

const router = Router();


async function createWallet(label: string, secret: string) {
  const response = await fetch(
    `https://hackathon-cloud-wallet-api.koyeb.app/wallet/create`,
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
    `https://hackathon-cloud-wallet-api.koyeb.app/connection`,
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
    `https://hackathon-cloud-wallet-api.koyeb.app/connection/accept-invitation`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
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
    `https://hackathon-cloud-wallet-api.koyeb.app/proof/send-request`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({
        protocol: "didcomm",
        connectionId: connectionId,
        presentationRequestLabel: "AI Agent Verification",
        presentationRequestVersion: "1.0.0",
        requestedAttributes: {
          "0_name": {
            name: "name",
          },
        },
      }),
    }
  );

  const data = await response.json();
  return data;
}

async function getProofRequestStatus(
  token: string,
  proofRecordId: string
) {
  const response = await fetch(
    `https://hackathon-cloud-wallet-api.koyeb.app/proof/${proofRecordId}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
    }
  );

  const data = await response.json();
  return data;
}

//API to create a new wallet
router.post("/create", async (req, res) => {
  const { label, secret } = req.body;
  try {
    const wallet = await createWallet(label, secret);
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
    const token = req.headers["authorization"]?.split(' ')[1] as string;    
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
    const token = req.headers["authorization"]?.split(' ')[1] as string;    
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
    const token = req.headers["authorization"]?.split(' ')[1] as string;    
    const decryptedToken = await decryptString(token, walletSecret);
    const proofRequest = await sendProofRequest(decryptedToken, connectionId);
    res.status(200).json(proofRequest);
  } catch (error) {
    console.error("Error sending proof request:", error);
    res.status(500).json({ error: "Failed to send proof request" });
  }
});

//API to get proof request status
router.get("/proof/status", async (req, res) => {
  const walletSecret = req.query.walletSecret as string;
  const proofRecordId = req.query.proofRecordId as string;
  try {

    const token = req.headers["authorization"]?.split(' ')[1] as string;    
    const decryptedToken = await decryptString(token, walletSecret);

    const proofStatus = await getProofRequestStatus(
      decryptedToken,
      proofRecordId
    );
    res.status(200).json(proofStatus);
  } catch (error) {
    console.error("Error getting proof request status:", error);
    res.status(500).json({ error: "Failed to get proof request status" });
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
