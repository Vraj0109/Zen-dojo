class Solution {
    public int[] hotelQueries(int[] rooms, int[] groups) {
        int[] r = rooms.clone();
        int n = r.length;
        int[] ans = new int[groups.length];
        for (int j = 0; j < groups.length; j++) {
            int need = groups[j];
            int found = 0;
            for (int i = 0; i < n; i++) {
                if (r[i] >= need) {
                    found = i + 1;
                    r[i] -= need;
                    break;
                }
            }
            ans[j] = found;
        }
        return ans;
    }
}
