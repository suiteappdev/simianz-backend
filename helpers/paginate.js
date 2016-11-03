function paginate(query, page, max_items, callback){
	return query.limit(max_items).skip(page > 1 ? max_items * page : 0);
	/*model.find().limit(max_items).skip(page > 1 ? max_items * page : 0).exec(function(err, data){
		if(!err){
	 		model.count().exec(function(err, count) {
	 			if(!err){
		 			callback(null, {
		                data: data,
		                page: page,
		                pages: Math.round(count / max_items) 
		            })	 				
	 			}
	        })
		}
	}); */
}

module.exports = paginate;
