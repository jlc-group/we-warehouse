# We-Warehouse Mobile - Location Tasks Feature

## Product Overview
A mobile-first warehouse management feature that enables warehouse workers to scan location QR codes and view/complete pending tasks at that location.

## Core Features

### 1. Location Scanning
- **Camera QR Scanner**: Tap blue button to open camera and scan location QR codes
- **Manual Input**: Type location code (e.g., "J5/4") in text field
- **Dropdown Selection**: Select from 1,111+ available warehouse locations

### 2. Task Display
After selecting a location, display pending tasks:
- **Pick Tasks**: Orders waiting to be picked from this location
- **Receive Tasks**: Inbound items to be received at this location

### 3. Task Completion
- Click on any task to open confirmation modal
- Adjust quantity if needed (+/- buttons)
- Confirm to complete task and update database
- Task turns green when completed

## User Flow
1. Open `/mobile/tasks` page
2. Scan QR code OR select location
3. View list of pending tasks
4. Tap task → Modal opens
5. Confirm quantity → Task completed
6. Move to next task or location

## Technical Requirements
- React + TypeScript frontend
- PostgreSQL backend via API
- Camera access for QR scanning
- Mobile-responsive design

## Expected Behavior
- Fast location lookup (<1 second)
- Immediate task list update after completion
- Clear visual feedback (colors, icons)
- Works on phone browsers
