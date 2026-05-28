// Tool/function definitions for the Realtime agents.
// These are forwarded to OpenAI Realtime via the session config; the model
// emits function calls that the client posts to /api/agent-tool, where they
// are validated, executed, and the result is fed back as a tool output.
//
// Each description follows a consistent shape — "What: … When: … Note: …" —
// so the model can pick the right tool reliably.

export type ToolDef = {
  type: "function";
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export const CUSTOMER_TOOLS: ToolDef[] = [
  {
    type: "function",
    name: "get_session_state",
    description:
      "What: returns where the guest currently is in the journey and any active reservation. When: at the START of every connection, including after the guest pauses and resumes the voice session. Note: this is the source of truth for the current state — never assume or reset it yourself.",
    parameters: { type: "object", properties: {}, additionalProperties: false }
  },
  {
    type: "function",
    name: "go_to_stage",
    description:
      "What: moves the on-screen view to a section of the journey. When: the guest asks to go back to, return to, or jump to the rooms, dates, checkout, confirmation, or concierge. Note: always call this to navigate — never claim a move without it; destinations only work when valid (checkout needs a pending hold, concierge needs a confirmed reservation).",
    parameters: {
      type: "object",
      properties: {
        stage: {
          type: "string",
          description:
            "Where to go: 'discovery' (browse rooms), 'availability' (dates), 'checkout', 'confirmation', or 'concierge' (room service & front desk)."
        }
      },
      required: ["stage"],
      additionalProperties: false
    }
  },
  {
    type: "function",
    name: "get_room_options",
    description:
      "What: shows the full catalog of room types (mood, capacity, nightly rate) on screen. When: the guest wants to browse, or return to, the rooms. Note: don't read the list aloud — let the cards speak.",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false
    }
  },
  {
    type: "function",
    name: "get_room_details",
    description:
      "What: showcases one room type on screen with its full detail (description, amenities, view, bed config, rate). When: the guest asks to see a specific room. Note: call immediately, without confirmation or announcement.",
    parameters: {
      type: "object",
      properties: {
        room_type_slug: {
          type: "string",
          description:
            "Slug of the room type, e.g. 'ocean-view-suite', 'garden-king-room', 'executive-business-suite', 'family-villa'."
        }
      },
      required: ["room_type_slug"],
      additionalProperties: false
    }
  },
  {
    type: "function",
    name: "show_room_amenities",
    description:
      "What: opens a detailed features & amenities panel for a room type on the guest's screen. When: the guest asks to see more details or amenities. Note: it doesn't book anything; call close_room_details when they're finished.",
    parameters: {
      type: "object",
      properties: {
        room_type_slug: { type: "string" }
      },
      required: ["room_type_slug"],
      additionalProperties: false
    }
  },
  {
    type: "function",
    name: "close_room_details",
    description:
      "What: closes the room features & amenities panel. When: the guest has finished looking at it.",
    parameters: { type: "object", properties: {}, additionalProperties: false }
  },
  {
    type: "function",
    name: "begin_date_selection",
    description:
      "What: brings the live date calendar onto the guest's screen, empty and ready to fill. When: the INSTANT you begin asking for the check-in date — call it before you finish the question and do NOT wait for the guest to answer. Note: afterwards use set_stay_details to fill in each date and the guest count as they're given.",
    parameters: { type: "object", properties: {}, additionalProperties: false }
  },
  {
    type: "function",
    name: "set_stay_details",
    description:
      "What: shows and updates an on-screen calendar with the stay dates as you collect them. When: while gathering check-in, check-out, and guest count in the room phase — call it after each piece so the calendar fills in live. Note: pass only what you have so far (it merges); dates as YYYY-MM-DD.",
    parameters: {
      type: "object",
      properties: {
        check_in_date: { type: "string", description: "ISO date YYYY-MM-DD." },
        check_out_date: { type: "string", description: "ISO date YYYY-MM-DD." },
        party_size: { type: "integer", minimum: 1, maximum: 8 }
      },
      additionalProperties: false
    }
  },
  {
    type: "function",
    name: "check_availability",
    description:
      "What: checks which room types are open between the given check-in and check-out dates for the party size. When: you have the dates and guest count. Note: pass dates as YYYY-MM-DD.",
    parameters: {
      type: "object",
      properties: {
        check_in_date: {
          type: "string",
          description: "ISO date YYYY-MM-DD for arrival."
        },
        check_out_date: {
          type: "string",
          description: "ISO date YYYY-MM-DD for departure."
        },
        party_size: { type: "integer", minimum: 1, maximum: 8 }
      },
      required: ["check_in_date", "check_out_date", "party_size"],
      additionalProperties: false
    }
  },
  {
    type: "function",
    name: "create_reservation_hold",
    description:
      "What: places a soft hold on a room and returns a reservation_code and pricing breakdown. When: the guest agrees to book, after you've taken the name. Note: a hold is not yet a confirmed booking.",
    parameters: {
      type: "object",
      properties: {
        guest_name: { type: "string" },
        room_type_slug: { type: "string" },
        check_in_date: { type: "string" },
        check_out_date: { type: "string" },
        party_size: { type: "integer", minimum: 1, maximum: 8 }
      },
      required: [
        "guest_name",
        "room_type_slug",
        "check_in_date",
        "check_out_date",
        "party_size"
      ],
      additionalProperties: false
    }
  },
  {
    type: "function",
    name: "modify_reservation_hold",
    description:
      "What: changes a HOLD before checkout — room type, dates, guest count, or name (include only the fields that change; price recalculates). When: the guest wants to adjust a pending hold. Note: read the new total back afterward.",
    parameters: {
      type: "object",
      properties: {
        reservation_code: { type: "string" },
        guest_name: { type: "string" },
        room_type_slug: { type: "string" },
        check_in_date: { type: "string" },
        check_out_date: { type: "string" },
        party_size: { type: "integer", minimum: 1, maximum: 8 }
      },
      required: ["reservation_code"],
      additionalProperties: false
    }
  },
  {
    type: "function",
    name: "cancel_reservation",
    description:
      "What: cancels a reservation by code (a hold or a confirmed stay), freeing the room and clearing it from the journey. When: the guest wants to cancel. Note: confirm with the guest before calling.",
    parameters: {
      type: "object",
      properties: {
        reservation_code: { type: "string" }
      },
      required: ["reservation_code"],
      additionalProperties: false
    }
  },
  {
    type: "function",
    name: "set_payment_details",
    description:
      "What: fills the on-screen secure payment form with the card details the guest gives by voice. When: at checkout, after you've collected the details. Note: never read the full card number or security code back aloud; sensitive values are discarded server-side and never stored.",
    parameters: {
      type: "object",
      properties: {
        card_name: { type: "string", description: "Cardholder name." },
        card_number: { type: "string" },
        expiry: { type: "string", description: "Expiry, e.g. 09/29." },
        cvv: { type: "string", description: "Security code." }
      },
      required: ["card_number"],
      additionalProperties: false
    }
  },
  {
    type: "function",
    name: "confirm_checkout",
    description:
      "What: completes checkout for a reservation_code — authorizes payment and assigns the room; returns the room number and booking receipt. When: the guest says to confirm or complete the booking. Note: also pass the card's last four digits (card_last4) and brand (card_brand) so the receipt and admin records match — NEVER pass the full card number or security code.",
    parameters: {
      type: "object",
      properties: {
        reservation_code: { type: "string" },
        card_last4: { type: "string", description: "The last four digits of the card only (e.g. '4242')." },
        card_brand: { type: "string", description: "Card brand, e.g. Visa, Mastercard, Amex." }
      },
      required: ["reservation_code"],
      additionalProperties: false
    }
  },
  {
    type: "function",
    name: "resume_reservation",
    description:
      "What: looks up a CONFIRMED reservation and opens the guest's concierge area (room service & lobby messaging) from any screen. When: a returning, booked guest wants room service or to message the front desk. Note: prefer the name on the booking; if it reports more than one match, call again with room_number or reservation_code.",
    parameters: {
      type: "object",
      properties: {
        guest_name: { type: "string", description: "The name on the booking (preferred)." },
        room_number: { type: "string", description: "Room number, to disambiguate same-name bookings." },
        reservation_code: { type: "string", description: "Reservation code, to disambiguate same-name bookings." }
      },
      additionalProperties: false
    }
  },
  {
    type: "function",
    name: "get_menu_items",
    description:
      "What: shows the room-service & concierge menu on screen. When: the guest wants to order or see what's available.",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false
    }
  },
  {
    type: "function",
    name: "place_room_service_order",
    description:
      "What: places a room-service order, automatically routed to the guest's assigned room. When: the guest orders items. Note: requires a confirmed reservation_code.",
    parameters: {
      type: "object",
      properties: {
        reservation_code: { type: "string" },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              menu_item_slug: { type: "string" },
              quantity: { type: "integer", minimum: 1, maximum: 10 }
            },
            required: ["menu_item_slug", "quantity"],
            additionalProperties: false
          }
        },
        notes: { type: "string" }
      },
      required: ["reservation_code", "items"],
      additionalProperties: false
    }
  },
  {
    type: "function",
    name: "send_lobby_message",
    description:
      "What: sends the guest's message to the lobby/front desk. When: the guest wants to tell or ask the front desk something. Note: requires a confirmed reservation_code.",
    parameters: {
      type: "object",
      properties: {
        reservation_code: { type: "string" },
        body: { type: "string" }
      },
      required: ["reservation_code", "body"],
      additionalProperties: false
    }
  }
];

export const ADMIN_TOOLS: ToolDef[] = [
  {
    type: "function",
    name: "get_admin_dashboard",
    description:
      "What: returns summary counts and headline stats for the lobby terminal. When: staff want an overview.",
    parameters: { type: "object", properties: {}, additionalProperties: false }
  },
  {
    type: "function",
    name: "get_all_active_stays",
    description:
      "What: returns all currently confirmed/active reservations with room numbers. When: staff want the current stays.",
    parameters: { type: "object", properties: {}, additionalProperties: false }
  },
  {
    type: "function",
    name: "get_room_journey",
    description:
      "What: returns a guest's journey timeline by reservation code OR room number. When: staff want to inspect one guest's activity.",
    parameters: {
      type: "object",
      properties: {
        reservation_code: { type: "string" },
        room_number: { type: "string" }
      },
      additionalProperties: false
    }
  },
  {
    type: "function",
    name: "get_pending_orders",
    description:
      "What: returns all room-service orders not yet delivered or cancelled. When: staff want to see outstanding orders.",
    parameters: { type: "object", properties: {}, additionalProperties: false }
  },
  {
    type: "function",
    name: "update_order_status",
    description:
      "What: updates a room-service order's status (RECEIVED, PREPARING, EN_ROUTE, DELIVERED, or CANCELLED). When: staff advance or cancel an order. Note: confirm with the staff member before calling.",
    parameters: {
      type: "object",
      properties: {
        order_id: { type: "string" },
        status: {
          type: "string",
          enum: ["RECEIVED", "PREPARING", "EN_ROUTE", "DELIVERED", "CANCELLED"]
        }
      },
      required: ["order_id", "status"],
      additionalProperties: false
    }
  },
  {
    type: "function",
    name: "get_lobby_messages",
    description:
      "What: returns all guest lobby messages, newest first. When: staff want to review messages.",
    parameters: { type: "object", properties: {}, additionalProperties: false }
  },
  {
    type: "function",
    name: "reply_to_guest",
    description:
      "What: sends a staff reply to a guest's lobby message. When: staff respond to a guest.",
    parameters: {
      type: "object",
      properties: {
        message_id: { type: "string" },
        body: { type: "string" }
      },
      required: ["message_id", "body"],
      additionalProperties: false
    }
  }
];
