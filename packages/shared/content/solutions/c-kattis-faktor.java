class Solution {
    public int minCitationsNeeded(int articles, int impact) {
        return articles * (impact - 1) + 1;
    }
}
