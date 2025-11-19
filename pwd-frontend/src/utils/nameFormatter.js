// Helper function to check if a value should be excluded from display
const shouldExcludeFromDisplay = (value) => {
  return !value || value.trim() === '' || value.trim().toUpperCase() === 'N/A';
};

// Utility function to convert text to proper case (sentence case)
// Capitalizes the first letter of each word and lowercases the rest
export const toProperCase = (text) => {
  if (!text) return '';
  return text.split(' ').map(word => {
    if (!word) return '';
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
};

// Utility function to format names with suffix
export const formatFullName = (firstName, middleName, lastName, suffix) => {
  const parts = [];
  
  if (firstName) parts.push(firstName);
  if (middleName && !shouldExcludeFromDisplay(middleName)) parts.push(middleName);
  if (lastName) parts.push(lastName);
  if (suffix) parts.push(suffix);
  
  return parts.join(' ').trim();
};

// Utility function to format name in "Last, First Middle Suffix" format
export const formatNameLastFirst = (firstName, middleName, lastName, suffix) => {
  const parts = [];
  
  if (lastName) parts.push(lastName);
  if (firstName) parts.push(firstName);
  if (middleName && !shouldExcludeFromDisplay(middleName)) parts.push(middleName);
  if (suffix) parts.push(suffix);
  
  return parts.join(' ').trim();
};

// Utility function to format name in "First Middle Last Suffix" format
export const formatNameFirstLast = (firstName, middleName, lastName, suffix) => {
  const parts = [];
  
  if (firstName) parts.push(firstName);
  if (middleName && !shouldExcludeFromDisplay(middleName)) parts.push(middleName);
  if (lastName) parts.push(lastName);
  if (suffix) parts.push(suffix);
  
  return parts.join(' ').trim();
};

// Utility function to get initials from name
export const getInitials = (firstName, lastName) => {
  return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
};

// Utility function to format middle name for display (excludes N/A)
export const formatMiddleNameForDisplay = (middleName) => {
  if (!middleName || middleName.trim() === '' || middleName.trim().toUpperCase() === 'N/A') {
    return '';
  }
  return middleName.trim();
};

// Utility function to format full name from parts (handles N/A properly)
export const formatName = (firstName, middleName, lastName, suffix) => {
  const parts = [];
  if (firstName) parts.push(firstName);
  const displayMiddleName = formatMiddleNameForDisplay(middleName);
  if (displayMiddleName) parts.push(displayMiddleName);
  if (lastName) parts.push(lastName);
  if (suffix) parts.push(suffix);
  return parts.join(' ').trim();
};
