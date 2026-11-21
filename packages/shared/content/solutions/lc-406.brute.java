class Solution {
    public int[][] reconstructQueue(int[][] people) {
        int n = people.length;
        int[][] res = new int[n][2];
        boolean[] occupied = new boolean[n];
        int[][] p = people.clone();
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                if (p[i][0] > p[j][0] || (p[i][0] == p[j][0] && p[i][1] < p[j][1])) {
                    int[] tmp = p[i];
                    p[i] = p[j];
                    p[j] = tmp;
                }
            }
        }
        for (int[] person : p) {
            int h = person[0], k = person[1];
            int count = 0;
            for (int i = 0; i < n; i++) {
                if (!occupied[i]) {
                    if (count == k) {
                        res[i] = person;
                        occupied[i] = true;
                        break;
                    }
                    count++;
                }
            }
        }
        return res;
    }
}
