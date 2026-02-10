# Developer Guide: API Key System

## Architecture

### Overview
The API key system uses a **dynamic initialization pattern** where the API client is created at runtime, allowing users to provide API keys without requiring build-time configuration.

### Key Components

#### 1. Service Layer (`services/geminiService.ts`)

**Initialization Pattern:**
```typescript
// Module-level state
let ai: GoogleGenAI | null = null;
let apiStatus: 'ready' | 'missing' | 'error' = 'missing';

// Get key from multiple sources
const getApiKey = (): string => {
  // Priority: localStorage > VITE_ > process.env > fallback
};

// Initialize on module load
const initializeAI = () => {
  try {
    const apiKey = getApiKey();
    if (apiKey && apiKey.trim()) {
      ai = new GoogleGenAI({ apiKey });
      apiStatus = 'ready';
    }
  } catch (error) {
    ai = null;
    apiStatus = 'error';
  }
};

initializeAI(); // Called on module import
```

**Public API:**
```typescript
export const getApiStatus = (): 'ready' | 'missing' | 'error'
export const reinitializeAPI = (): void
export const generateNPCDialog(npc, gameState, query): Promise<string>
export const generateDungeonTip(gameState): Promise<string>
```

**Usage in Dialog Generation:**
```typescript
export const generateNPCDialog = async (...) => {
  // Calculate goal position
  let goalPos = /* find stairs or seed */;
  const relativeDir = getDirection(gameState.playerPos, goalPos);
  
  // Fallback if no API
  if (!ai) {
    return generateHardcodedHint(npc, gameState, playerQuery, relativeDir);
  }
  
  // Use Gemini 2.5 Flash
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });
  
  return response.text || "...";
};
```

#### 2. UI Components

**SettingsButton:**
- Simple status indicator button
- Reflects current API status with color coding
- Opens settings modal on click

**SettingsModal:**
- API key input with masking
- Save/Copy/Clear actions
- Status indicator and help text
- Link to Google AI Studio

#### 3. Application Integration (`App.tsx`)

**State:**
```typescript
const [settingsOpen, setSettingsOpen] = useState(false);
const [apiStatus, setApiStatus] = useState<'ready' | 'missing' | 'error'>('missing');
```

**Initialization:**
```typescript
useEffect(() => {
  // ... existing code ...
  setApiStatus(getApiStatus());
}, []);
```

**Event Handling:**
```typescript
<SettingsButton 
  onClick={() => setSettingsOpen(true)} 
  apiStatus={apiStatus}
/>
```

## Data Flow

### API Key Loading
```
User Saves Key
    ↓
localStorage.setItem('GEMINI_API_KEY', key)
    ↓
Page Reload (automatic)
    ↓
getApiKey() checks localStorage first
    ↓
initializeAI() creates GoogleGenAI client
    ↓
UI updates with green status
    ↓
NPCs provide dynamic dialogue
```

### Dialog Generation
```
User talks to NPC
    ↓
handleChatMessage() called
    ↓
generateNPCDialog() checks if (ai)
    ↓
Yes: Call Gemini 2.5 Flash
    ↓
No: Return generateHardcodedHint()
    ↓
Response shown in modal
```

## Storage Strategy

### localStorage Keys
- `GEMINI_API_KEY` - User's API key (plaintext, browser-local)

### Why localStorage?
✅ Pros:
- Persistent across sessions
- User doesn't need to re-enter on each load
- No server-side storage needed
- Easy to clear
- Privacy-respecting

⚠️ Cons:
- Vulnerable to XSS attacks
- Can be read by browser console
- Users may forget they have it saved

### Security Considerations
- Keys never transmitted to external servers
- Only sent to Google's API
- Users can delete anytime
- App doesn't track usage

## Error Handling

### API Initialization Errors
```typescript
try {
  ai = new GoogleGenAI({ apiKey });
  apiStatus = 'ready';
} catch (error) {
  console.error('Failed to initialize Gemini API:', error);
  ai = null;
  apiStatus = 'error';
}
```

### API Call Errors
```typescript
try {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });
  return response.text || "...";
} catch (error) {
  console.error("Gemini Error:", error);
  apiStatus = 'error';
  return generateHardcodedHint(...); // Fallback
}
```

### Fallback System
```
API Call
    ↓
    ├─ Success → Return response
    │
    ├─ Network Error → Fallback to hints
    │
    ├─ Invalid Key → Fallback to hints
    │
    └─ Rate Limited → Fallback to hints
         ↓
     Return hardcoded hint
         ↓
     Game continues normally
```

## Adding New Dynamic Features

### Template: New Dynamic Generator

```typescript
export const generateCustomContent = async (
  gameState: GameState
): Promise<string> => {
  // If no API, use hardcoded version
  if (!ai) {
    return getHardcodedVersion(gameState);
  }
  
  // Build prompt with game context
  const prompt = `
    Context: ${gameState.level}
    [Your custom prompt here]
  `;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "Fallback text";
  } catch (error) {
    console.error("Custom Generator Error:", error);
    return getHardcodedVersion(gameState);
  }
};
```

## Testing API Integration

### Manual Testing

1. **Test 1: No API Key**
   - Clear localStorage: `localStorage.removeItem('GEMINI_API_KEY')`
   - Reload game
   - Button should be gray
   - NPC dialogue should be generic

2. **Test 2: Invalid API Key**
   - Set: `localStorage.setItem('GEMINI_API_KEY', 'invalid-key')`
   - Reload game
   - Button should show red error
   - Check console for error logs

3. **Test 3: Valid API Key**
   - Paste real key from Google AI Studio
   - Button should turn green
   - NPC dialogue should vary each time
   - Check network tab for API calls

### Automated Testing Template

```typescript
describe('API Key System', () => {
  test('detects missing API key', () => {
    localStorage.removeItem('GEMINI_API_KEY');
    expect(getApiStatus()).toBe('missing');
  });
  
  test('loads API key from localStorage', () => {
    localStorage.setItem('GEMINI_API_KEY', 'test-key-123');
    reinitializeAPI();
    expect(getApiStatus()).toBe('ready'); // May fail if key invalid
  });
  
  test('falls back to hardcoded hints on error', async () => {
    // Mock API error
    const result = await generateNPCDialog(npc, state, "hello");
    expect(result).toBeDefined();
  });
});
```

## Configuration

### Environment Variables (Build-time)
```bash
# .env.local
VITE_GEMINI_API_KEY=sk-proj-xxxxx...
```

### Runtime Configuration
```typescript
// In browser console
localStorage.setItem('GEMINI_API_KEY', 'your-key-here');
location.reload();
```

## API Limits & Quotas

### Google's Free Tier
- **1,500 requests/minute**
- **Up to 1M tokens/minute**
- Per-model limits
- No credit card required

### Typical Gameplay
- **Dialogue requests**: 10-20 per hour
- **Tips requests**: 5-10 per hour
- **Well within free tier**

### Monitoring Usage
```javascript
// In browser console
// Add before generateContent call:
console.log('Request count:', requestCount++);
```

## Troubleshooting Guide

### API Status Shows Red but Key Seems Valid
1. Check key hasn't expired in Google Cloud Console
2. Verify API is enabled in Google Cloud project
3. Try in incognito/private mode
4. Check browser console (F12) for specific error

### SettingsButton Not Appearing
1. Check that component is imported: `import SettingsButton from './components/SettingsButton'`
2. Verify it's rendered in App.tsx: `<SettingsButton />`
3. Check CSS z-index isn't hidden by other elements

### Key Doesn't Persist
1. Browser privacy mode disables localStorage
2. Browser's storage limit exceeded
3. Cache cleared after closing browser
4. Cookies/storage disabled in browser settings

## Performance Considerations

### API Call Latency
- **First call**: 1-3 seconds (includes model load)
- **Subsequent calls**: 500ms-1s
- **Acceptable** for occasional NPC interactions

### Optimization Opportunities
```typescript
// Implement caching for common queries
const dialogueCache = new Map<string, string>();

if (dialogueCache.has(cacheKey)) {
  return dialogueCache.get(cacheKey)!;
}

// ... make API call ...
dialogueCache.set(cacheKey, response);
```

## Future Enhancements

### Planned Features
- [ ] API key validation endpoint
- [ ] Usage statistics dashboard
- [ ] Per-NPC customization
- [ ] Conversation history persistence
- [ ] Multiple API provider support

### Architecture Considerations
```typescript
// Support multiple API providers
interface AIProvider {
  generateContent(prompt: string): Promise<string>;
  getStatus(): 'ready' | 'error' | 'missing';
}

// Singleton pattern for provider management
class AIManager {
  static instance: AIManager;
  private provider: AIProvider;
  
  static getInstance(): AIManager { /* ... */ }
  setProvider(provider: AIProvider) { /* ... */ }
}
```

---

**Last Updated**: February 10, 2026  
**Maintainer**: Development Team  
**API Version**: Gemini 2.5 Flash
