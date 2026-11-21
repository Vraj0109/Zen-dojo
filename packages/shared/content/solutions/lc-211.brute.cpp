#include <string>
#include <vector>

using namespace std;

class WordDictionary {
    vector<string> words;

public:
    WordDictionary() {}

    void addWord(string word) {
        words.push_back(word);
    }

    bool search(string word) {
        int n = word.size();
        for (const string& w : words) {
            if ((int)w.size() != n) continue;
            bool ok = true;
            for (int i = 0; i < n; i++) {
                if (word[i] != '.' && word[i] != w[i]) {
                    ok = false;
                    break;
                }
            }
            if (ok) return true;
        }
        return false;
    }
};
