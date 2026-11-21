class Solution {
    public int oddManOut(int[] codes) {
        int n = codes.length;
        for (int i = 0; i < n; i++) {
            int count = 0;
            for (int j = 0; j < n; j++) {
                if (codes[i] == codes[j]) {
                    count++;
                }
            }
            if (count == 1) {
                return codes[i];
            }
        }
        return -1;
    }
}
