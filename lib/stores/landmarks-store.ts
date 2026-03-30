// Landmarks store – manages pose landmark state
// TODO: Migrate from drawing-app/context/LandmarksContext.jsx
//
// Replaces React Context with Zustand for better performance.
// Uses refs + version bumps pattern from original to avoid excessive re-renders.
//
// State shape:
// - originalRef: LandmarkFrame[]
// - processedRef: LandmarkFrame[]
// - dimensions: Dimensions
// - originalVersion / processedVersion
//
// Actions:
// - setDimensions, setOriginals, addOriginal, clearOriginals
// - setProcessed, addProcessed, clearProcessed

export {};
