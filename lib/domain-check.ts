export function checkDomainAccess(email: string): boolean {
  if (!email) return false;

  // Check if email is in admin list
  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
  if (adminEmails.includes(email)) {
    return true;
  }

  // Check if email domain is allowed
  const allowedDomains = process.env.ALLOWED_DOMAINS?.split(',').map(d => d.trim()) || [];
  const emailDomain = email.split('@')[1];
  
  return allowedDomains.includes(emailDomain);
}

export function checkDomainAccessClient(email: string, adminEmails: string[], allowedDomains: string[]): boolean {
  if (!email) return false;

  // Check if email is in admin list
  if (adminEmails.includes(email)) {
    return true;
  }

  // Check if email domain is allowed
  const emailDomain = email.split('@')[1];
  return allowedDomains.includes(emailDomain);
}
