class Solution:
    def longNameInitials(self, name: str) -> str:
        return "".join(part[0] for part in name.split("-") if part)
