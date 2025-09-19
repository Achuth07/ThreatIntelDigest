# Documentation Updates - Source Management Enhancement

## Overview
Updated both `README.md` and `replit.md` to reflect the recent implementation of enhanced source management functionality, particularly the deactivation/reactivation system for RSS sources.

## Key Changes Made

### README.md Updates

1. **Expanded Built-in RSS Sources Section:**
   - Updated from 7 sources to 25+ categorized sources
   - Organized into 5 categories: Vendor & Private Threat Research, Government & Agency Alerts, Specialized & Malware Focus, General Security News, Legacy Sources
   - Added specific source names and descriptions
   - Moved Flashpoint from Legacy to Vendor & Private Threat Research category
   - Moved Juniper Networks Threat Research from Government & Agency Alerts to Vendor & Private Threat Research category
   - Updated Legacy Sources category to only contain The DFIR Report

2. **Enhanced Features Documentation:**
   - Added "Source Management Features" subsection
   - Documented non-destructive removal functionality
   - Explained hover controls and reactivation capabilities
   - Updated API endpoints to include PATCH operations

3. **Updated User Instructions:**
   - Modified "First Run" section to reflect new dialog-based source management
   - Updated component descriptions in project structure
   - Enhanced source management workflow explanation

4. **API Documentation Enhancement:**
   - Added PATCH and DELETE endpoints for RSS sources
   - Clarified source activation/deactivation operations

### replit.md Updates

1. **Enhanced Overview:**
   - Added description of source management capabilities
   - Mentioned categorized source organization

2. **Database Schema Updates:**
   - Added source management lifecycle documentation
   - Explained isActive field functionality

3. **RSS Feed Integration Enhancement:**
   - Updated source count and categorization details
   - Added source management features description
   - Documented smart reactivation functionality
   - Updated Vendor & Private Threat Research category to include Flashpoint and Juniper Networks

4. **UI/UX Design Patterns:**
   - Added hover-based controls documentation
   - Mentioned categorized dialog interfaces

5. **RSS Data Sources Reorganization:**
   - Restructured from simple list to categorized format
   - Expanded source coverage across categories

## Technical Features Documented

### Source Management System
- **Non-Destructive Deactivation:** Sources are set to `isActive: false` instead of being deleted
- **Hover Controls:** Minus icon appears on hover for quick removal
- **Smart Reactivation:** Previously added sources can be reactivated without duplication
- **Categorized Selection:** Sources organized by type for better discoverability

### API Enhancements
- **PATCH Operations:** Enable source activation/deactivation
- **DELETE Operations:** Support permanent removal when needed
- **Query Filtering:** Only active sources appear in sidebar

### UI/UX Improvements
- **Tabbed Dialogs:** Organized source management interface
- **Visual Feedback:** Clear indicators for source status
- **Confirmation Dialogs:** Prevent accidental operations

## Impact
These documentation updates ensure that users and developers understand:
- How to effectively manage RSS sources
- The non-destructive nature of source removal
- The categorized organization of built-in sources
- The enhanced API capabilities for source management

The updates maintain consistency between README.md (user-focused) and replit.md (technical architecture-focused) while providing comprehensive coverage of the new functionality.