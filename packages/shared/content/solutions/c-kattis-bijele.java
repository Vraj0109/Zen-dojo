class Solution {
    public int[] missingPieces(int[] found) {
        int[] target = {1, 1, 2, 2, 2, 8};
        int[] out = new int[6];
        for (int i = 0; i < 6; i++) out[i] = target[i] - found[i];
        return out;
    }
}
