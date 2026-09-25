/**
 * Klaviyo Server-Side Integration Service
 * Uses Klaviyo API Revision 2026-07-15
 */
const AppError = require("../../core/errors/AppError");

const KLAVIYO_API_BASE = "https://a.klaviyo.com/api";
const KLAVIYO_REVISION = "2026-07-15";

const getCredentials = () => {
  const apiKey = (process.env.KLAVIYO_PRIVATE_API_KEY || process.env.KLAVIYO_API_KEY || "").trim();
  const listId = (process.env.KLAVIYO_LIST_ID || "").trim();
  return { apiKey, listId };
};

/**
 * Subscribes a profile to the existing Klaviyo list via the profile-subscription-bulk-create-jobs API.
 */
const subscribeProfileToList = async ({ email, firstName, lastName, phoneNumber }) => {
  if (!email || typeof email !== "string") {
    throw new AppError("A valid email address is required for subscription.", 400, "INVALID_EMAIL");
  }

  const { apiKey, listId } = getCredentials();

  if (!apiKey || !listId) {
    console.warn("[Klaviyo Warning] Klaviyo integration skipped: missing private API key or List ID in environment variables.");
    return { success: false, message: "Klaviyo integration environment variables are missing." };
  }

  const normalizedEmail = email.toLowerCase().trim();
  const profileAttributes = {
    email: normalizedEmail,
    subscriptions: {
      email: {
        marketing: {
          consent: "SUBSCRIBED",
        },
      },
    },
  };

  if (firstName) profileAttributes.first_name = String(firstName).trim();
  if (lastName) profileAttributes.last_name = String(lastName).trim();
  if (phoneNumber) profileAttributes.phone_number = String(phoneNumber).trim();

  const payload = {
    data: {
      type: "profile-subscription-bulk-create-job",
      attributes: {
        profiles: {
          data: [
            {
              type: "profile",
              attributes: profileAttributes,
            },
          ],
        },
      },
      relationships: {
        list: {
          data: {
            type: "list",
            id: listId,
          },
        },
      },
    },
  };

  try {
    const response = await fetch(`${KLAVIYO_API_BASE}/profile-subscription-bulk-create-jobs/`, {
      method: "POST",
      headers: {
        Authorization: `Klaviyo-API-Key ${apiKey}`,
        Revision: KLAVIYO_REVISION,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (response.ok || response.status === 202) {
      return { success: true, message: "Subscription successful" };
    }

    const errorPayload = await response.json().catch(() => ({}));
    console.error(`[Klaviyo Error] Status ${response.status}:`, JSON.stringify(errorPayload));
    return {
      success: false,
      message: "Unable to subscribe to mailing list at the moment.",
    };
  } catch (error) {
    console.error("[Klaviyo Network Error]:", error.message);
    return {
      success: false,
      message: "Unable to reach Klaviyo subscription service.",
    };
  }
};

/**
 * Sends a custom event metric ("Application Approved") to Klaviyo to trigger Flows.
 */
const trackApprovalEvent = async ({ email, firstName, lastName, role, registrationNumber }) => {
  const { apiKey } = getCredentials();
  if (!apiKey || !email) return;

  const normalizedEmail = email.toLowerCase().trim();
  const payload = {
    data: {
      type: "event",
      attributes: {
        properties: {
          registration_number: registrationNumber || "",
          role: role || "STUDENT",
          letter_type: role === "TEACHER" ? "Teacher Employment Letter" : "Student Admission Letter",
          school_name: "Enoch International College",
          approved_at: new Date().toISOString(),
        },
        metric: {
          data: {
            type: "metric",
            attributes: {
              name: "Application Approved",
            },
          },
        },
        profile: {
          data: {
            type: "profile",
            attributes: {
              email: normalizedEmail,
              first_name: firstName || undefined,
              last_name: lastName || undefined,
            },
          },
        },
      },
    },
  };

  try {
    await fetch(`${KLAVIYO_API_BASE}/events/`, {
      method: "POST",
      headers: {
        Authorization: `Klaviyo-API-Key ${apiKey}`,
        Revision: KLAVIYO_REVISION,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("[Klaviyo Track Event Error]:", err.message);
  }
};

module.exports = {
  subscribeProfileToList,
  trackApprovalEvent,
};
