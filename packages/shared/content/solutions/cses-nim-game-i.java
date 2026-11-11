class Solution {
    public String nimGameI(int[] heaps) {
        int xorSum = 0;
        for (int x : heaps) {
            xorSum ^= x;
        }
        return (xorSum != 0) ? "first" : "second";
    }
}