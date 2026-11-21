#include <string>

class Solution {
public:
    int digitQueries(std::string k_str) {
        unsigned long long k = std::stoull(k_str);
        unsigned long long len = 1, count = 9, start = 1;
        while (k > len * count) {
            k -= len * count;
            len++;
            count *= 10;
            start *= 10;
        }
        start += (k - 1) / len;
        std::string s = std::to_string(start);
        return s[(k - 1) % len] - '0';
    }
};
