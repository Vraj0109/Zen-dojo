class Solution:
    def minCitationsNeeded(self, articles: int, impact: int) -> int:
        return articles * (impact - 1) + 1
