# App Idea Generator - Additional Changes

## Current Issues to Address

### 1. File Downloading and Copying Functionality
Currently, when using the copy or download functions, only the main build guide content is copied/downloaded, regardless of which tab the user is viewing. Additionally, the naming convention for downloaded files should be improved.

### 2. Guide Type Naming Based on Language Selection
The application is currently hard-coded to generate three types of guides: "Build Guide," "JavaScript Guide," and "CSS Guide." This doesn't make sense when languages other than JavaScript are selected (e.g., Python, Java, etc.).

## Planned Solutions

### 1. Fix Download/Copy to Use Current File Content

#### Current behavior:
- Copy/download functions always use `this.currentProject.content` which refers to the main build guide
- Downloaded filename is always based on the main project title

#### Changes needed:
1. **Update `copyOutputToClipboard()` method:**
   - Get content from `this.currentFiles.get(this.currentFileType)` instead of `this.currentProject`
   - Use a content property appropriate for the current file type

2. **Update `downloadAsMarkdown()` method:**
   - Get content from the current file map based on `this.currentFileType` 
   - Create dynamic filename including both app name and guide type:
     - For build guide: `${appName.toLowerCase().replace(/[^a-z0-9]/gi, '_')}.md`
     - For other guides: `${appName.toLowerCase().replace(/[^a-z0-9]/gi, '_')}_${fileType}.md`

3. **Implementation details:**
   ```javascript
   copyOutputToClipboard() {
     // Get the current active file content
     const currentFile = this.currentFiles.get(this.currentFileType);
     if (!currentFile) return;
     
     navigator.clipboard.writeText(currentFile.content)
       .then(() => {
         this.showNotification(`${this.getFileTypeName()} copied to clipboard!`, 'success');
       })
       .catch(err => {
         this.showNotification('Failed to copy to clipboard', 'error');
         console.error('Could not copy text: ', err);
       });
   }
   
   downloadAsMarkdown() {
     const currentFile = this.currentFiles.get(this.currentFileType);
     if (!currentFile) return;
     
     const appName = this.currentProject.title;
     let fileName;
     
     // Create appropriate filename based on file type
     if (this.currentFileType === 'buildGuide') {
       fileName = `${appName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
     } else {
       const fileTypeLabel = this.getFileTypeName().replace(' Guide', '');
       fileName = `${appName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${fileTypeLabel.toLowerCase()}.md`;
     }
     
     const blob = new Blob([currentFile.content], { type: 'text/markdown' });
     
     const link = document.createElement('a');
     link.href = URL.createObjectURL(blob);
     link.download = fileName;
     
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
     
     this.showNotification(`${this.getFileTypeName()} downloaded!`, 'success');
   }
   
   // Helper method to get proper file type name
   getFileTypeName() {
     if (this.currentFileType === 'buildGuide') return 'Build Guide';
     return currentFile.title.split(' - ')[1] || this.currentFileType.toUpperCase();
   }
   ```

### 2. Dynamic Guide Types Based on Selected Language

#### Current behavior:
- Hard-coded references to "JS.md" and "CSS.md"
- UI buttons with fixed labels "JS" and "CSS"
- Tab labels and file names are fixed to JavaScript and CSS
- Prompt generation assumes JavaScript and CSS

#### Changes needed:

1. **Create a language mapping system:**
   ```javascript
   // Map primary languages to their code and style file types
   this.languageFileTypes = {
     'javascript': { code: 'js', style: 'css' },
     'typescript': { code: 'ts', style: 'css' },
     'python': { code: 'py', style: 'css' }, 
     'java': { code: 'java', style: 'css' },
     'csharp': { code: 'cs', style: 'css' },
     'go': { code: 'go', style: 'css' },
     'rust': { code: 'rs', style: 'css' },
     'swift': { code: 'swift', style: 'css' },
     'kotlin': { code: 'kt', style: 'css' },
     'php': { code: 'php', style: 'css' }
   };
   ```

2. **Update how file generation buttons are labeled:**
   - Make the button labels dynamic based on selected language
   - Update the tooltip text
   ```javascript
   updateFileButtonLabels() {
     const primaryLanguage = document.getElementById('primary-language').value;
     const languageInfo = this.languageFileTypes[primaryLanguage] || { code: 'code', style: 'style' };
     
     const jsFileBtn = document.getElementById('js-file-btn');
     jsFileBtn.querySelector('.file-icon').textContent = languageInfo.code.toUpperCase();
     jsFileBtn.title = `Generate ${this.getLanguageDisplayName(primaryLanguage)} Guide`;
     
     const cssFileBtn = document.getElementById('css-file-btn');
     cssFileBtn.querySelector('.file-icon').textContent = languageInfo.style.toUpperCase();
     cssFileBtn.title = `Generate ${languageInfo.style.toUpperCase()} Style Guide`;
   }
   
   getLanguageDisplayName(languageCode) {
     const displayNames = {
       'javascript': 'JavaScript',
       'typescript': 'TypeScript',
       'python': 'Python',
       'java': 'Java',
       'csharp': 'C#',
       'go': 'Go',
       'rust': 'Rust',
       'swift': 'Swift',
       'kotlin': 'Kotlin',
       'php': 'PHP'
     };
     return displayNames[languageCode] || languageCode;
   }
   ```

3. **Modify API prompt creation to be language-aware:**
   - Change `createJSDocPrompt` to `createCodeDocPrompt`
   - Make all references to "JavaScript" dynamic based on selected language
   ```javascript
   createCodeDocPrompt(ideaData, featuresText, experienceLevelPrompt, appTypePrompt) {
     const languageName = this.getLanguageDisplayName(ideaData.primaryLanguage);
     const languageExtension = this.languageFileTypes[ideaData.primaryLanguage]?.code || 'code';
     
     // ... existing context inclusion code ...
     
     return `
     Create a detailed ${languageName} implementation guide in Markdown format for an application called "${ideaData.appName}". 
     
     Application Details:
     - Description: ${ideaData.description}
     - Primary Language: ${ideaData.primaryLanguage}
     - Application Type: ${appTypePrompt}
     - Frameworks/Tools: ${ideaData.frameworks.join(', ')}
     - Features: ${featuresText}
     - Target Audience: ${ideaData.targetAudience}
     ${aiModelInfo}
     
     ${experienceLevelPrompt}
     
     This ${languageExtension.toUpperCase()}.md file should focus specifically on ${languageName} implementation details including:
     
     1. ${languageName} Architecture Overview
     2. Core ${languageName} Functions and Classes
     3. API Integration (if applicable)
     4. State Management Approach
     5. Data Processing Logic
     6. Code Examples for Key Features
     7. Performance Optimization Tips
     8. Testing Strategies for ${languageName}
     9. Integration with UI components
     
     Include actual ${languageName} code examples that demonstrate implementation of the key features.
     For complex features, include step-by-step implementation details.
     Organize the document in a way that developers can use it as a reference during implementation.
     
     Make sure your ${languageName} implementation guide is consistent with the other documentation and follows the same architectural approach.
     ${buildGuideContext}
     ${cssGuideContext}
     
     Return ONLY the markdown content, properly formatted.`;
   }
   ```

4. **Update file generation handler:**
   ```javascript
   async handleAdditionalFileGeneration(fileType) {
     if (!this.currentProject) {
       this.showNotification('No project selected', 'error');
       return;
     }
     
     // Map generic fileType ('js' or 'css') to language-specific extensions
     const primaryLanguage = this.currentProject.data.primaryLanguage;
     const languageInfo = this.languageFileTypes[primaryLanguage] || { code: 'js', style: 'css' };
     
     // Transform fileType to match the current language
     const actualFileType = fileType === 'js' ? 'code' : 'style';
     const fileExtension = fileType === 'js' ? languageInfo.code : languageInfo.style;
     
     // Check if this file already exists
     if (this.currentFiles.has(actualFileType)) {
       this.switchToFile(actualFileType);
       return;
     }
     
     try {
       // Show loading indicator
       document.getElementById('loading-overlay').classList.add('show');
       document.getElementById('loading-overlay').querySelector('p').textContent = 
         `Generating ${fileType === 'js' ? this.getLanguageDisplayName(primaryLanguage) : 'Style'} documentation...`;
       
       // Add file type and extension to data for the API
       const extendedData = {
         ...this.currentProject,
         data: {
           ...this.currentProject.data,
           fileType: actualFileType,
           fileExtension: fileExtension
         }
       };
       
       // Generate the file
       const fileData = await apiHandler.generateAdditionalFile(extendedData, actualFileType);
       
       // Add to current files
       this.currentFiles.set(actualFileType, fileData);
       
       // Create tab for the new file
       this.createFileTabs();
       
       // Switch to the new file
       this.switchToFile(actualFileType);
       
       // Add to project storage
       this.addFileToProject(this.currentProject.id, fileData);
       
       this.showNotification(`${fileType === 'js' ? this.getLanguageDisplayName(primaryLanguage) : 'Style'} guide generated!`, 'success');
     } catch (error) {
       this.showNotification(`Error: ${error.message}`, 'error');
     } finally {
       // Hide loading indicator
       document.getElementById('loading-overlay').classList.remove('show');
     }
   }
   ```

5. **Update createFileTabs method to use language-aware names:**
   ```javascript
   createFileTabs() {
     const fileTabs = document.getElementById('file-tabs');
     fileTabs.innerHTML = '';
     
     // Only show tabs if we have more than one file
     if (this.currentFiles.size <= 1) {
       fileTabs.style.display = 'none';
       return;
     }
     
     fileTabs.style.display = 'flex';
     
     // Get language info
     const primaryLanguage = this.currentProject.data.primaryLanguage;
     const languageName = this.getLanguageDisplayName(primaryLanguage);
     
     // Always add the main build guide tab
     const buildGuideTab = document.createElement('button');
     buildGuideTab.classList.add('file-tab');
     buildGuideTab.textContent = 'Build Guide';
     buildGuideTab.dataset.fileType = 'buildGuide';
     if (this.currentFileType === 'buildGuide') {
       buildGuideTab.classList.add('active');
     }
     fileTabs.appendChild(buildGuideTab);
     
     // Add tab for code guide if it exists
     if (this.currentFiles.has('code')) {
       const codeTab = document.createElement('button');
       codeTab.classList.add('file-tab');
       codeTab.textContent = `${languageName} Guide`;
       codeTab.dataset.fileType = 'code';
       if (this.currentFileType === 'code') {
         codeTab.classList.add('active');
       }
       fileTabs.appendChild(codeTab);
     }
     
     // Add tab for style guide if it exists
     if (this.currentFiles.has('style')) {
       const styleTab = document.createElement('button');
       styleTab.classList.add('file-tab');
       styleTab.textContent = 'Style Guide';
       styleTab.dataset.fileType = 'style';
       if (this.currentFileType === 'style') {
         styleTab.classList.add('active');
       }
       fileTabs.appendChild(styleTab);
     }
     
     // Add click event listeners
     document.querySelectorAll('.file-tab').forEach(tab => {
       tab.addEventListener('click', (e) => {
         const fileType = e.target.dataset.fileType;
         this.switchToFile(fileType);
       });
     });
   }
   ```

## Implementation Strategy

1. **Step 1: Update the file downloading and copying functions**
   - Modify `copyOutputToClipboard()` to use current file content
   - Modify `downloadAsMarkdown()` to use current file content and generate appropriate filenames
   - Add a helper method `getFileTypeName()` to display proper file type names

2. **Step 2: Add language mapping system**
   - Add the `languageFileTypes` map to the constructor
   - Implement the `getLanguageDisplayName()` helper method
   - Add an `updateFileButtonLabels()` method

3. **Step 3: Update the API integration**
   - Rename `createJSDocPrompt` and `createCSSDocPrompt` to be more generic
   - Make the prompt generation language-aware using the selected language
   - Update API handling to pass language information

4. **Step 4: Modify file handling in the UI**
   - Update the file generation button IDs and references
   - Update the file tabs creation to be language-aware
   - Make sure to call `updateFileButtonLabels()` when language selection changes

5. **Step 5: Update event listeners and callbacks**
   - Update event listeners for file generation buttons
   - Call `updateFileButtonLabels()` when the primary language selector changes

## Testing Strategy

After implementing these changes, test the following scenarios:

1. **Download/Copy Testing:**
   - Try downloading each file type (build guide, code guide, style guide)
   - Verify the file names are correct with app name and guide type
   - Test copying content from each tab and verify the correct content is copied

2. **Language-Aware UI Testing:**
   - Select different languages (JavaScript, Python, Java, etc.)
   - Verify button labels update appropriately
   - Check file generation works correctly for each language
   - Verify tab names reflect the selected language

3. **Edge Cases:**
   - Test when no language is selected
   - Test with unusual project names (special characters, very long names)
   - Verify behavior when switching languages after guides are already generated