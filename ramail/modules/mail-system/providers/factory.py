from .ews_provider import EwsProvider
from .nic_provider import SmtpImapProvider
from interfaces.base_provider import BaseMailProvider

class ProviderFactory:
    @staticmethod
    def get_provider(email_address: str, password: str, exchange_host: str = "mail.rajasthan.gov.in") -> BaseMailProvider:
        """
        Auto-identifies the provider to use based on the domain.
        If domain is gov.in or nic.in, it uses SmtpImapProvider for NICeMail.
        If domain is rajasthan.gov.in or rajpolice.gov.in, it uses EwsProvider.
        """
        domain = email_address.split('@')[-1].lower()
        
        if domain in ["gov.in", "nic.in"]:
            # Uses mgovcloud by default
            return SmtpImapProvider(
                email_address=email_address,
                password=password,
                smtp_server="smtp.mgovcloud.in",
                smtp_port=465,
                imap_server="imap.mgovcloud.in",
                imap_port=993
            )
        else:
            # Fallback to the old system
            return EwsProvider(
                email=email_address,
                password=password,
                server=exchange_host
            )
