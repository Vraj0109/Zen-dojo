class Solution {
    public int oddManOut(int[] codes) {
        int x = 0;
        for (int c : codes) x ^= c;
        return x;
    }
}
