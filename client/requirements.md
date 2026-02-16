## Packages
@xyflow/react | The core library for the node-based workflow editor (React Flow successor)
dagre | Graph layout algorithm for auto-arranging nodes
framer-motion | For smooth sidebar transitions and modal animations
lucide-react | Beautiful icons for node types and UI elements
clsx | Utility for constructing className strings conditionally
tailwind-merge | Utility for merging Tailwind CSS classes without conflicts
date-fns | For formatting dates in execution history

## Notes
The workflow canvas requires a parent container with a defined height (usually 100vh or calc(100vh - header)).
Node types need to be registered in the React Flow component.
Custom nodes will use Tailwind for styling to match the application theme.
