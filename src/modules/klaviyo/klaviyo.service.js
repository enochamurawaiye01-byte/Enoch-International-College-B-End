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
    console.debug("[Klaviyo Info] Klaviyo environment variables missing. Skipping Klaviyo sync.");
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
const trackApprovalEvent = async ({
  email,
  name,
  firstName,
  lastName,
  username,
  role,
  registrationNumber,
  classOrProgramme,
  academicSession,
  department,
  applicationNumber,
}) => {
  const { apiKey } = getCredentials();
  if (!apiKey) {
    const error = new Error("Klaviyo is not configured. Set KLAVIYO_PRIVATE_API_KEY with the events:write permission.");
    error.code = "KLAVIYO_NOT_CONFIGURED";
    throw error;
  }
  if (typeof email !== "string" || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email.trim())) {
    const error = new Error("A valid email recipient is required for the Klaviyo approval event.");
    error.code = "INVALID_EMAIL";
    throw error;
  }

  const normalizedEmail = email.toLowerCase().trim();
  const nameParts = String(name || "").trim().split(/\s+/).filter(Boolean);
  const profileFirstName = firstName || nameParts.shift();
  const profileLastName = lastName || nameParts.join(" ");
  const payload = {
    data: {
      type: "event",
      attributes: {
        properties: {
          registration_number: registrationNumber || "",
          role: (role || "STUDENT").toUpperCase(),
          letter_type: (role || "").toUpperCase() === "TEACHER" ? "Teacher Employment Letter" : "Student Admission Letter",
          school_name: "Mercy T College Nursery and Primary School",
          username: username || normalizedEmail,
          class_or_programme: classOrProgramme || "",
          academic_session: academicSession || "",
          department: department || "",
          application_number: applicationNumber || "",
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
              first_name: profileFirstName || undefined,
              last_name: profileLastName || undefined,
            },
          },
        },
      },
    },
  };

  try {
    const response = await fetch(`${KLAVIYO_API_BASE}/events/`, {
      method: "POST",
      headers: {
        Authorization: `Klaviyo-API-Key ${apiKey}`,
        Revision: KLAVIYO_REVISION,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });
    if (response.status !== 202) {
      const errorPayload = await response.json().catch(() => ({}));
      const message = errorPayload.errors?.map(({ detail, title }) => detail || title).filter(Boolean).join("; ")
        || `Klaviyo rejected the approval event (HTTP ${response.status}).`;
      const error = new Error(message);
      error.code = `KLAVIYO_HTTP_${response.status}`;
      throw error;
    }
    console.log(`[Klaviyo Approval Event Accepted] role=${(role || "STUDENT").toUpperCase()}`);
    return {
      success: true,
      acceptedCount: 1,
      response: "Accepted by Klaviyo for Application Approved flow processing",
    };
  } catch (error) {
    console.error(`[Klaviyo Approval Event Failed] code=${error.code || "UNKNOWN"} message=${error.message}`);
    throw error;
  }
};

module.exports = {
  subscribeProfileToList,
  trackApprovalEvent,
};
