import re
from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _


class PasswordComplexityValidator:
    """
    Validate that the password meets minimum complexity requirements.
    
    Password must contain:
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    - At least one special character
    """
    
    def __init__(
        self, 
        min_uppercase=1, 
        min_lowercase=1, 
        min_digits=1, 
        min_special_chars=1
    ):
        self.min_uppercase = min_uppercase
        self.min_lowercase = min_lowercase
        self.min_digits = min_digits
        self.min_special_chars = min_special_chars
    
    def validate(self, password, user=None):
        errors = []
        
        # Check for uppercase letters
        if self.min_uppercase > 0:
            uppercase_chars = re.findall(r'[A-Z]', password)
            if len(uppercase_chars) < self.min_uppercase:
                errors.append(
                    ValidationError(
                        _(f"Password must contain at least {self.min_uppercase} uppercase letter(s)."),
                        code='password_no_uppercase',
                    )
                )
        
        # Check for lowercase letters
        if self.min_lowercase > 0:
            lowercase_chars = re.findall(r'[a-z]', password)
            if len(lowercase_chars) < self.min_lowercase:
                errors.append(
                    ValidationError(
                        _(f"Password must contain at least {self.min_lowercase} lowercase letter(s)."),
                        code='password_no_lowercase',
                    )
                )
        
        # Check for digits
        if self.min_digits > 0:
            digits = re.findall(r'\d', password)
            if len(digits) < self.min_digits:
                errors.append(
                    ValidationError(
                        _(f"Password must contain at least {self.min_digits} digit(s)."),
                        code='password_no_digit',
                    )
                )
        
        # Check for special characters
        if self.min_special_chars > 0:
            special_chars = re.findall(r'[^A-Za-z0-9]', password)
            if len(special_chars) < self.min_special_chars:
                errors.append(
                    ValidationError(
                        _(f"Password must contain at least {self.min_special_chars} special character(s)."),
                        code='password_no_special_char',
                    )
                )
        
        if errors:
            raise ValidationError(errors)
    
    def get_help_text(self):
        return _(
            f"Your password must contain at least {self.min_uppercase} uppercase letter(s), "
            f"{self.min_lowercase} lowercase letter(s), {self.min_digits} digit(s), and "
            f"{self.min_special_chars} special character(s)."
        ) 