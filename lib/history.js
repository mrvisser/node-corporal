
var CorporalHistory = module.exports = function() {
    this.clear();
};

CorporalHistory.prototype.clear = function() {
    this._history = [];
    this.reset();
};

CorporalHistory.prototype.reset = function() {
    this._index = -1;
};

CorporalHistory.prototype.push = function(str) {
    this._history.push(str);
};

CorporalHistory.prototype.prev = function() {
    if (this._index === this._history.length - 1) {
        return null;
    }

    this._index++;
    return this._history[this._history.length - this._index - 1];
};

CorporalHistory.prototype.next = function() {
    if (this._index === 0) {
        return null;
    }

    this._index--;
    return this._history[this._history.length - this._index - 1];
};
