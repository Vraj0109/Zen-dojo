#include <vector>

class Solution {
public:
    std::vector<int> nearestSmallerValues(std::vector<int>& arr) {
        int n = arr.size();
        std::vector<int> ans(n, 0);
        for (int i = 0; i < n; i++) {
            for (int j = i - 1; j >= 0; j--) {
                if (arr[j] < arr[i]) {
                    ans[i] = j + 1;
                    break;
                }
            }
        }
        return ans;
    }
};
