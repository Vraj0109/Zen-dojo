class Solution:
    def abbreviate(self, word: str) -> str:
        if len(word) <= 10:
            return word
        return f"{word[0]}{len(word) - 2}{word[-1]}"
