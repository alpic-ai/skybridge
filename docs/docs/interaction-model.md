---
sidebar_position: 2
---

# Interaction Model

Users interact with the model using the conversation interface on ChatGPT. ChatGPT will send a tool call request to your MCP server if it might help achieve the user's goal. When a tool is marked as a widget, ChatGPT will render a widget on the conversation interface.

Users interact with widgets rendered on the conversation interface. Widgets are React components that are rendered on the conversation interface. They are rendered inside an iframe inline with the conversation on ChatGPT.

This dual interface requires you to design your app to be accessible from both the conversation interface and the widget interface.
