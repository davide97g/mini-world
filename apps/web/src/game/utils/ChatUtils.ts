import {
  STATUE_RESPONSES,
  STATUE_DEFAULT_RESPONSES,
} from "../config/ChatConfig";

export const getStatueResponse = (playerMessage: string): string => {
  const lowerMessage = playerMessage.toLowerCase();

  // Check for exact matches or partial matches
  for (const [key, response] of Object.entries(STATUE_RESPONSES)) {
    if (lowerMessage.includes(key)) {
      return response;
    }
  }

  // Special case for "how are you"
  if (lowerMessage.includes("how") && lowerMessage.includes("you")) {
    return STATUE_RESPONSES["how are you"];
  }

  // Return random default response
  return STATUE_DEFAULT_RESPONSES[
    Math.floor(Math.random() * STATUE_DEFAULT_RESPONSES.length)
  ];
};

