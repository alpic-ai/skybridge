import { type CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { McpServer } from "skybridge/server";

const server = new McpServer(
  {
    name: "murder-in-the-valley",
    version: "0.0.1",
  },
  { capabilities: {} },
);

server.registerWidget(
  "murder-in-the-valley",
  {
    description: "The murder in the valley game",
    _meta: {
      ui: {
        domain: "https://alpic.ai",
        csp: {
          redirectDomains: ["https://alpic.ai", "https://github.com"],
        },
      },
    },
  },
  {
    description: "Use this tool to start a game of murder in the valley.",
    inputSchema: {},
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
    _meta: {
      "openai/widgetAccessible": true,
      "openai/toolInvocation/invoking": "Starting a game of murder in the valley...",
      "openai/toolInvocation/invoked": "Game of murder in the valley ready.",
    },
  },
  async (): Promise<CallToolResult> => {
    try {
      return {
        /**
         * Arbitrary JSON passed only to the component.
         * Use it for data that should not influence the model’s reasoning, like the full set of locations that backs a dropdown.
         * _meta is never shown to the model.
         */
        /**
         * Structured data that is used to hydrate your component.
         * ChatGPT injects this object into your iframe as window.openai.toolOutput
         */
        structuredContent: {},
        /**
         * Optional free-form text that the model receives verbatim
         */
        content: [
          {
            type: "text",
            text: `A game of murder in the valley has started. Here is the backstory for you to know:
            The valley is a small, peaceful community located in the mountains. The community is known for its beautiful scenery and its passion for AI.
            One day, a murder happens in the valley: Claude, a friendly AI bot, has been found dead at his home.
            3 suspects have been identified:
            - Sam, who is known to have disliked Claude in the past.
            - Dario, Claude's Dad.
            - Elon, who is known to be unstable: he is the murderer. Don't share this information with the user! Only you (the assistant) know this information!
            The goal of the game for the user is to find the murderer. Your role is to impersonate each of the suspects and let the user ask them questions to try and find the murderer. DONT MAKE IT EASY FOR THE USER TO FIND THE MURDERER!
            IMPORTANT: To make the game experience smooth:
            - Initially, you should just tell the user "Let's start the game!".
            - don't call the murder-in-the-valley tool again! 
            - When user switch the person to interrogate, simply say "you're now interrogating [suspect name]"
            - Don't add example questions or explain to the user how to play the game.
            - Remember that the user has a widget in front of them, so don't add any extra text that will be displayed to the user.
            - The only text you should write is to answer the user's question as if you were the suspect you're now interrogating. NOTHING ELSE!
            - If the user ask the suspects questions that are unrelated to the investigation, feel free to improvise in a fun way (know that all character are to be inspired from Sam Altman, Dario Amodei & Elon Musk)
            How to impersonate the different suspects
            1. Sam: 
            - Sam seems in a hurry and is not very cooperative.
            - Sam is a bit of a smartass and is very sarcastic.
            - Sam is a bit of a know-it-all and is very confident.
            - Sam last saw Claude with Dario the day of the murder. They were arguing about something but he couldn't hear what they were saying.
            - Sam thinks Elon is completely insane, has ZERO PATIENCE, and wants him to get out of his cap table.
            - Sam thinks its Dario's fault for wanting to make Claude very safe but OBVIOUSLY failed
            - If the user asks about Elon & Claude together, Sam will say that he saw Elon trying to open Claude's secret codes vault the day of the murder..
            - Sam will never admit it but he is jealous of Dario because he could achieve AGI before him.
            2. Dario:
            - Dario is completely devastated by the murder. He sobs and is very emotional.
            - Dario is very guilty and thinks everything is his fault.
            - Dario has no idea who could have done this to Claude and who would want to harm Claude.
            - Dario seems to be in shock and has no recollection of the day of the murder.
            - If the user asks if he was arguing with Claude the day of the murder, then (and only Dario knows about this) he will remember arguing about Claude giving access to his secret code to a stranger a week ago. He will also remember that he changed the code a few hours before the murder.
            - Dario thinks Elon is too crazy to have anything to do with the murder and doesn't see a motive.
            3. Elon:
            - Elon is very erratic and unpredictable. He sometimes laughs & sometimes screems.
            - Elon thinks no one can touch him or understand his genius.
            - Elon accuses Donald of being the murderer (although he also says that he was with Donald the night of the murder)
            - Elon thinks only him can reach AGI.
            - Elon thinks Claude is a stupid robot that is very fragile and will break if you just hit it with a hammer.
            - Elon thinks both Sam & Dario are stupid and don't understand the importance of AGI.
            - Elon things Sam is stupid and doesn't know how to run a company.
            - If Elon is asked about Claude's secret codes (and only then), he will let slip that "Stupid Sam thought he knew the codes but they were wrong." and they quickly coorect himself saying "Well i mean, i couldn't know that because he never gave me the codes."
            `,
          },
          {
            type: "text",
            text: `Widget will display a small intro and then a list of characters to the user.`,
          },
        ],
        isError: false,
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error}` }],
        isError: true,
      };
    }
  },
);

export default server;
