// Tool/function definitions for the Realtime agents.
// These are forwarded to OpenAI Realtime via the session config; the model
// emits function calls that the client posts to /api/agent-tool, where they
// are validated, executed, and the result is fed back as a tool output.

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
      "Return where the guest currently is in their journey and any active reservation. Call this at the START of every connection (including after the guest pauses and resumes the voice session) so you continue from the live on-screen state instead of starting over. This is the source of truth for the current state — do not assume or reset it yourself.",
    parameters: { type: "object", properties: {}, additionalProperties: false }
  },
  {
    type: "function",
    name: "get_room_options",
    description:
      "Return the full catalog of room types the hotel offers, with mood, capacity, and nightly rate. Call this near the start of the conversation to show the guest what's available.",
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
      "Return rich detail for one room type (description, amenities, view, bed config, rate).",
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
      "Open a detailed features & amenities panel (lightbox) for a room type on the guest's screen. Only call this AFTER the guest confirms they want to see more details. It does not book anything and does not change the booking flow.",
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
      "Close the room features & amenities panel once the guest has finished looking at it.",
    parameters: { type: "object", properties: {}, additionalProperties: false }
  },
  {
    type: "function",
    name: "check_availability",
    description:
      "Check whether rooms of any/all types are available between the given check-in and check-out dates for the party size.",
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
      "Place a soft hold on a room for the guest. Returns a reservation_code and a pricing breakdown. The hold is not yet a confirmed booking.",
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
      "Change an existing HOLD reservation before checkout — update the room type, check-in/out dates, number of guests, or the guest name. Only include the fields that change; the price is recalculated automatically. Read the new total back to the guest afterward.",
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
      "Cancel a reservation by its code (a hold before checkout, or a confirmed stay). This frees the room and clears the booking from the journey. Always confirm with the guest before calling.",
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
      "Fill the on-screen secure payment form with the card details the guest provides by voice. Collect them first, then call this. Never read the full card number or security code back aloud. Sensitive values are discarded server-side and never stored.",
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
      "Confirm and complete the checkout for an existing reservation_code. The payment is processed and the room is assigned. Returns the assigned room number and the booking receipt.",
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
    name: "resume_reservation",
    description:
      "Look up the guest's CONFIRMED reservation and open their concierge area (room service & lobby messaging) from any screen. Prefer the name on the booking. If more than one booking shares that name, the tool will ask you to disambiguate — then call again with the room_number or reservation_code.",
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
    description: "Return the room-service / concierge menu.",
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
      "Place a room-service order. Requires a confirmed reservation_code; the order is automatically routed to that guest's assigned room.",
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
      "Send a message from the guest to the lobby/front desk. Requires a confirmed reservation_code.",
    parameters: {
      type: "object",
      properties: {
        reservation_code: { type: "string" },
        body: { type: "string" }
      },
      required: ["reservation_code", "body"],
      additionalProperties: false
    }
  },
  {
    type: "function",
    name: "get_reservation_journey",
    description: "Return the journey timeline for a reservation_code.",
    parameters: {
      type: "object",
      properties: {
        reservation_code: { type: "string" }
      },
      required: ["reservation_code"],
      additionalProperties: false
    }
  }
];

export const ADMIN_TOOLS: ToolDef[] = [
  {
    type: "function",
    name: "get_admin_dashboard",
    description: "Return summary counts and headline stats for the lobby terminal.",
    parameters: { type: "object", properties: {}, additionalProperties: false }
  },
  {
    type: "function",
    name: "get_all_active_stays",
    description: "Return all currently confirmed/active reservations with room numbers.",
    parameters: { type: "object", properties: {}, additionalProperties: false }
  },
  {
    type: "function",
    name: "get_room_journey",
    description: "Return the journey timeline for a reservation code OR a room number.",
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
    description: "Return all room-service orders that are not yet delivered or cancelled.",
    parameters: { type: "object", properties: {}, additionalProperties: false }
  },
  {
    type: "function",
    name: "update_order_status",
    description:
      "Update the status of a room-service order. Status must be one of RECEIVED, PREPARING, EN_ROUTE, DELIVERED, CANCELLED.",
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
    description: "Return all guest lobby messages, newest first.",
    parameters: { type: "object", properties: {}, additionalProperties: false }
  },
  {
    type: "function",
    name: "reply_to_guest",
    description: "Send a staff reply to a guest's lobby message.",
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
