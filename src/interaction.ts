import { APIGatewayProxyEvent } from "aws-lambda";
import {
  InteractionResponseType,
  InteractionType,
  verifyKey,
} from "discord-interactions";

import { Configuration, OpenAIApi } from "openai";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

export const handler = async (event: APIGatewayProxyEvent) => {
  // Verify the request
  const signature = event.headers["x-signature-ed25519"];
  const timestamp = event.headers["x-signature-timestamp"];
  const isValidRequest = verifyKey(
    event.body!,
    signature!,
    timestamp!,
    process.env.CLIENT_PUBLIC_KEY!
  );
  if (!isValidRequest) {
    return {
      statusCode: 401,
      body: "Invalid request signature",
    };
  }

  if (event.body) {
    let responseBody;
    const body = JSON.parse(event.body);
    switch (body.type) {
      case InteractionType.PING:
        responseBody = {
          type: InteractionResponseType.PONG,
        };
        break;
      case InteractionType.APPLICATION_COMMAND:
        const response = await openai.createCompletion({
          model: "text-curie-001",
          prompt: body.data.options[0].value,
          temperature: 0,
          max_tokens: 200,
        });

        responseBody = {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `${body.data.options[0].value}: ${response.data.choices[0].text}`,
          },
        };
        break;
      default:
        break;
    }

    return {
      statusCode: 200,
      body: JSON.stringify(responseBody),
    };
  }

  return {
    statusCode: 200,
  };
};
