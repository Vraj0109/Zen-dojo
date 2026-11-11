class Solution {
    public int waysToDistributeCandies(int n) {
        if (n <= 2) return 0;
        return (n - 1) / 2;
    }
}
