---
description: 
globs: 
alwaysApply: true
---
Always reference EditorPanel as EditorPanel.tsx

# Overall UI
* on the left hand side is the EditorPanel. The EditorPanel was working well, so don't change the code there.
* the right hand side is the node canvas editor
* in between the left and right hand side there is a separator line that users can drag left or right to increase the size of the one side or the other 
* the resizable separator should start in the middle horizontally, and a user should be able to grab the separator and move it left or right to resize the view

#drag and drop tab onto existing node
Users can drag and drop a tab onto an existing node. The name of the node should change to match the tab's name. If the tab is of a different type than the node, then update the node's type to match the tab's type. 

# Smart Connector: Automatically connecting nodes
Let's make the assumption that when nodes are added to the diagram canvas that the user intends for the new node to be connected to one of the existing nodes. When a new node is dropped, add connect the new node to the closest existing node, and if the new node is above the closest existing node, make the connection start from the bottom of the new node and connect to the top of the closest existing node, and if the new node is below the existing node, make the connection start from the bottom of the existing node to the top of the new node.

# Placement of the nodes, naming, and types
* When a user drags and drops a tab onto the diagram canvas the center of the node should be placed where the cursor is at the time that the left mouse button is selected
* The name of canvas should match the tab
* The type of the node must match the tab type
* If the a new tabs name is the same as an existing tabs name, create the tabe with the same name combined with (Copy 1), then (Copy 2), etc. as additional copies are added

#Placement of nodes when added from the node pallette
When nodes are added to the graph by clicking a node type on the node palette we should follow the following rules:
(1) in the case where the canvas is empty, keep the the Y coordinate 15% of the screen height, and move the X coordinate to the X coordinate of the middle of the visible part of the canvas , which will be in between the node pallette and the clear all button
(2) if the graph already has nodes, place the node underneath the lowest node in the canvas, and connect the lowest existing node from it's bottom to the top of the new node that's just been added right beneath it
(3) if the graph already has nodes, the new node should center aligned horizontally directly below the lowest existing node 

# Delete nodes
User can delete a node by clicking on it and then clicking the delete key on the keyboard. When a node is selected, its border should change to a bright green color. 

# delete connectors
Users can left-click on a connector to delete that connector 

# Shift select nodes to move them
Users are able to select groups of nodes by holding shift and clicking the left mouse button. Once 2 or mode nodes are selected, the user can move that group of nodes together 

# Node styles
Buttons should have a white background and the letter in the circle matching the type of node. "DS" for "Data Source" type nodes, Add "P" for "Prompt" type nodes, and Add "D" for "Display" type nodes

# style 
Use Open Sans font everywhere

# Check the following
Make sure that NODE_WIDTH, NODE_HEIGHT, etc. are defined
Use screenToFlowPosition instead of project. `project` is deprecated. Instead use `screenToFlowPosition`. There is no need to subtract the react flow bounds anymore! 
React Hooks must be called in a React function component or a custom React Hook function



# ace editor
For the tabbed text editor, I want to use Ace the editor with the appropriate syntax highlighting for each type of tab

# making the diagram functional
## Prompt nodes. 
* users can drag and drop a prompt tab to the node canvas to create a new prompt node 
* Prompt nodes should have the properties in this example: {label, prompt, input, output, tabId} 
* there should be view for the prompt under title "PROMPT", and the generated output from the prompt in a text view under title "GENERATED OUTPUT"
* on first drag and drop, we use the prompt to generate a response with our gemini integration
* Whenever the related prompt tab is updated and after 1 second pause, gemini model should be called again. If the prompt says only output JSON, make sure we're only outputting JSON. 
* For prompt node linked to a Prompt tab, the prompt tab content should be automatically executed as a prompt using our gemini integration. 
* if the output is to large to fit within 100px, then turn that view into a scrollable view
* If the prompt node is the target node to which a source node connects, then display the a view in the prompt node marked input 
* When two nodes in the graph are connected, then the output of the starting node becomes the input for the node its connected to, and the output content is used to replace the text "INPUT" in the receiving node.

* Double-clicking on the output field creates a tab of type "Output" with the name matching the label + "Output"
* if there is an existing output tab with the same name,  then create new tabs with the label + "Output" plus a number, like Prompt1 Output 1, Prompt1 Output 2, and so on 
* like all the other node types, the prompt type should have a delete button


Create a list of top 10 MITRE tactics, format as JSON

```For each element of INPUT, create a summary of the threat actors typically associated with the threat actor, and then enrich the original array with that threat actor summary in field threat_actor_summary.

INPUT```

two changes: (1) let's make the font smaller for the prompt output. (2) double-clicking on the output should create a new "Output" tab with the output, and named "TAB_NAME Output"



What's missing still is that we're not copying the output of the previous node to a new field "input" that we add to the receiving end of the connector.
 
 # Spreadsheets creation
 Let's create a new node type, which is create a sheets document. The requirements are that the "Spreadsheet" node takes in structured data input from its source node and creates a sheets view with that data. Shouold use ReactGrid


# Lessons learned
* executing changes more than one at a time is a bad idea
* Start with the code repo set up, with good names for each batch


ResizeObserver loop completed with undelivered notifications.