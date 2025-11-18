# Broker Configuration Management Feature

## Overview
Added the ability to save multiple broker configurations with their related topics in local storage and quickly switch between them.

## Features Added

### 1. **Save Multiple Configurations**
- Save broker endpoint(s) and topics combinations with custom names
- Persistent storage using localStorage
- Validation to prevent duplicate names
- Update existing configurations

### 2. **Quick Loading**
- Load saved configurations with one click
- Quick access buttons for the first 4 configurations
- Detailed view for all configurations with expandable section

### 3. **Configuration Management**
- Edit existing configurations
- Delete individual configurations
- Clear all configurations at once
- Visual indicators showing number of saved configs

### 4. **User Experience**
- Prevents configuration changes while connected
- Clears messages when switching between configurations
- Keyboard shortcuts (Enter to save, Escape to cancel)
- Auto-focus on configuration name input
- Toast notifications for all actions

## Usage

### Saving a Configuration
1. Fill in your broker endpoints and topics
2. Click "Add New" in the Saved Configurations section
3. Enter a descriptive name (e.g., "Local Dev", "Production")
4. Press Enter or click "Save"

### Loading a Configuration
1. **Quick Load**: Click any configuration name button in the "Quick Load" section
2. **Detailed View**: Expand "View All Configurations" and click "Load"
3. **Requirements**: Must be disconnected from current broker first

### Editing a Configuration
1. Click the edit icon (pencil) next to a configuration
2. The form will populate with current values
3. Modify the broker and/or topics fields
4. Click "Update" to save changes

### Managing Configurations
- **Delete**: Click the X button next to individual configurations
- **Clear All**: Use the "Clear All" button to remove all saved configurations
- **View Details**: Expand the detailed view to see full broker URLs and creation dates

## Technical Implementation

### Data Structure
```typescript
interface BrokerConfig {
  id: string
  name: string
  broker: string
  topics: string
  createdAt: Date
}
```

### Storage
- Uses browser localStorage with key: `kafka-broker-configs`
- Automatic serialization/deserialization of Date objects
- Error handling for corrupted storage data

### State Management
- React state for configuration list
- Separate state for UI controls (panel visibility, editing mode)
- Proper cleanup and validation

## Benefits
1. **Quick Environment Switching**: Easily switch between dev, staging, and production
2. **Reduced Errors**: No need to manually enter broker/topic details repeatedly
3. **Team Sharing**: Configurations can be shared via export/import (future enhancement)
4. **Productivity**: Faster development workflow with saved configurations

## Keyboard Shortcuts
- **Enter**: Save current configuration when editing name
- **Escape**: Cancel configuration editing and close panel
