class Solution {
    public int countMagnetGroups(String[] magnets) {
        if (magnets == null || magnets.length == 0) return 0;
        int groups = 1;
        for (int i = 1; i < magnets.length; i++) {
            if (!magnets[i].equals(magnets[i - 1])) groups++;
        }
        return groups;
    }
}
