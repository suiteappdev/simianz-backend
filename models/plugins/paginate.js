module.exports = exports = function (schema) {
	    schema.static.paginate = function(page, max_items){
	        this.limit(max_items).skip(page > 1 ? max_items * page : 0);
	     }
    }
