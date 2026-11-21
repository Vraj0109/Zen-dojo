#include <vector>

class Solution {
public:
    std::vector<int> sumOfThreeValues(std::vector<int>& arr, int target) {
        int n = arr.size();
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                for (int k = j + 1; k < n; k++) {
                    if ((long long)arr[i] + arr[j] + arr[k] == target) {
                        return {i + 1, j + 1, k + 1};
                    }
                }
            }
        }
        return {-1, -1, -1};
    }
};
