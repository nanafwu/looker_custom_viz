/**
 * Welcome to the Looker Visualization Builder! Please refer to the following resources 
 * to help you write your visualization:
 *  - API Documentation - https://github.com/looker/custom_visualizations_v2/blob/master/docs/api_reference.md
 *  - Example Visualizations - https://github.com/looker/custom_visualizations_v2/tree/master/src/examples
 **/

function compareConversionProbability (
  variantALabel, variantBLabel,
  alphaPosteriorA, betaPosteriorA, alphaPosteriorB, betaPosteriorB) {
  var samples = 10000;
  var aGreaterThanB = 0;
  var bGreaterThanA = 0;
    
  _.map(_.range(samples), function(i){ 
    var sampleA = jStat.beta.sample(alphaPosteriorA, betaPosteriorA); 
    var sampleB = jStat.beta.sample(alphaPosteriorB, betaPosteriorB); 
    if (sampleA > sampleB) {
      aGreaterThanB += 1;
    } else {
      bGreaterThanA += 1;
    }  
  }); 
  
  var probAGreaterThan_B = (aGreaterThanB / samples) * 100;
  var probBGreaterThan_A = (bGreaterThanA / samples) * 100;
  
  if (probAGreaterThan_B > probBGreaterThan_A) {
    return 'There is a ' + probAGreaterThan_B + '% chance that ' + variantALabel + ' converts better than ' + variantBLabel;
  } else {
    return 'There is a ' + probBGreaterThan_A + '% chance that ' + variantBLabel + ' converts better than ' + variantALabel;
  }
}

/*
Get dimensions or measures to use for variant, 
# visitors, and # conversions.
Set the 1st string dimension as the "variant".
Set the 2nd numeric dimension as the "# visitors".
Set the 3rd numeric dimension as the "conversions".
*/
function getLabels(queryResponse) {
  
    var lblVariant, lblVisitors, lblCnversions;
    
    // First check dimensions
    for(var dim of queryResponse.fields.dimensions) {
      if (!lblVariant && dim.type === "string") {
        lblVariant = dim.name
      } else if (!lblVisitors && dim.type == "number") {
        lblVisitors = dim.name
      } else if (!lblCnversions && dim.type == "number") {
        lblCnversions = dim.name
      }
    }
    // Next check measures
    for(var msr of queryResponse.fields.measures) {
      if (!lblVariant && msr.type === "string") {
        lblVariant = msr.name
      } else if (!lblVisitors && msr.type == "number") {
        lblVisitors = msr.name
      } else if (!lblCnversions && msr.type == "number") {
        lblCnversions = msr.name
      }
    }
    
    return {
      variant: lblVariant,
      visitors: lblVisitors,
      conversions: lblCnversions
    }
}


/*
Get the data to use for AB test calculations.
Only check first two rows of data
*/
function getABTestData(data, labelVariant, labelVisitors, labelConversions) {

    var visitorsToA = data[0][labelVisitors].value; 
    var visitorsToB = data[1][labelVisitors].value; 
    
    var conversionsFromA = data[0][labelConversions].value; 
    var conversionsFromB = data[1][labelConversions].value; 
  
    var variantALabel = data[0][labelVariant].value; 
    var variantBLabel = data[1][labelVariant].value;
      
    return {
      variantALabel: variantALabel,
      variantBLabel: variantBLabel,
      visitorsToA: visitorsToA,
      visitorsToB: visitorsToB,
      conversionsFromA: conversionsFromA,
      conversionsFromB: conversionsFromB
    }
}

looker.plugins.visualizations.add({

 options: {
    first_option: {
      type: "string",
      label: "My First Option",
      default: "Default Value"
    },
    second_option: {
      type: "number",
      label: "My Second Option",
      default: 42
    }
  },
  
 /**
 /**
  * The create function gets called when the visualization is mounted but before any
  * data is passed to it.
  **/
  create: function(element, config){
    console.log('-- Creating something --')
    element.style.fontFamily = `"Open Sans", "Helvetica", sans-serif`
    //element.innerHTML = "";
  },

 /**
  * UpdateAsync is the function that gets called (potentially) multiple times. It receives
  * the data and should update the visualization with the new data.
  **/
  updateAsync: function(data, element, config, queryResponse, details, doneRendering){
    console.log('-- Update Async --')
    console.log('data: ', data),
    console.log('config: ', config)
    console.log('queryResponse', queryResponse)

    var alphaPrior = 1;
    var betaPrior = 1;
    
    var labels = getLabels(queryResponse);
    var abTestData = getABTestData(data, labels.variant, labels.visitors, labels.conversions)
    
    var alphaPosteriorA = alphaPrior + abTestData.conversionsFromA;
    var betaPosteriorA = betaPrior + abTestData.visitorsToA - abTestData.conversionsFromA;
    
    var alphaPosteriorB = alphaPrior + abTestData.conversionsFromB;
    var betaPosteriorB = betaPrior + abTestData.visitorsToB - abTestData.conversionsFromB;
    
    // set the dimensions and margins of the graph
    var graphWidth = 400;
    var graphHeight = 250;
    var axisPadding = 40;
    var probabilityTextHeight = graphHeight + 30 + axisPadding;
    var legendX = graphWidth + axisPadding;
    var width = graphWidth + axisPadding + 200,
        height = probabilityTextHeight + 50;
        
    // Clear any existing SVGs
    d3.select(element).selectAll("*").remove();
    
    // append the svg object to the body of the page
    var svg = d3.select(element)
      .append("svg")
        .attr("width", width)
        .attr("height", height)
    
    // Calculate PDF points of posterior distribution
    var betaA = []
    var betaB = []
    var maxY = 0;
    var maxX = 0;
    
    // Draw beta distributions
    var minPDFValue = 0.001; // Don't bother plotting if PDF value falls below this
    for (i = 0; i <= 1; i += 0.01) {
        var pdfBetaA = jStat.beta.pdf(i, alphaPosteriorA, betaPosteriorA);
        var pdfBetaB = jStat.beta.pdf(i, alphaPosteriorB, betaPosteriorB);
        
        if (pdfBetaB > maxY || pdfBetaA > maxY) {
          maxY = pdfBetaB;  
        }
        
        if (pdfBetaA > minPDFValue && i > maxX) {
            maxX = i;
        }   
        if (pdfBetaB > minPDFValue && i > maxX) {
            maxX = i;
        }    
        if (pdfBetaA > minPDFValue) {
          betaA.push([i, pdfBetaA])
        }
        if (pdfBetaB > minPDFValue) {
          betaB.push([i, pdfBetaB])
        }   
    }
    
    // add the x Axis
    var xScale = d3.scaleLinear()
        .domain([0, maxX ])
        .range([0, graphWidth]);
    
     var xAxis = d3.axisBottom().scale(xScale)
      .tickFormat(function (tickValue) {
       return tickValue;
     });
    
     // Add the text label for X Axis
    svg.append("text")
      .attr("x", (graphWidth + axisPadding) / 2)
      .attr("y", graphHeight + axisPadding)
      .style("text-anchor", "middle")
      .style("font-size", "12px")
      .text("Conversion Rate");
    
    svg.append("g")
      .attr("transform", "translate(" + axisPadding + "," + graphHeight + ")")
      .call(xAxis);

    // add the y Axis
    var yScale = d3.scaleLinear()
          .range([graphHeight, 0])
          .domain([0, maxY]);
    
    svg.append("g")
        .attr("transform", "translate(" + axisPadding + ", 0)")
        .call(d3.axisLeft(yScale));

    // Add the text label for Y axis
    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -(graphHeight / 2))
      .attr("y", axisPadding / 4)
      .style("text-anchor", "middle")
      .style("font-size", "12px")
      .text("Probability Density")
    
    // Plot the area of posterior A
    svg.append("path")
        .attr("class", "mypath")
        .datum(betaA)
        .attr("fill", "#69b3a2")
        .attr("opacity", ".6")
        .attr("stroke", "#000")
        .attr("stroke-width", 1)
        .attr("stroke-linejoin", "round")
        .attr("transform", "translate(" + axisPadding + ", 0)")
        .attr("d",  d3.line()
          .curve(d3.curveBasis)
            .x(function(d) { 
              return xScale(d[0]); })
            .y(function(d) { return yScale(d[1]); })
        );

    // Plot the area of posterior B
    svg.append("path")
        .attr("class", "mypath")
        .datum(betaB)
        .attr("fill", "#404080")
        .attr("opacity", ".6")
        .attr("stroke", "#000")
        .attr("stroke-width", 1)
        .attr("stroke-linejoin", "round")
        .attr("transform", "translate(" + axisPadding + ", 0)")
        .attr("d",  d3.line()
          .curve(d3.curveBasis)
            .x(function(d) { return xScale(d[0]); })
            .y(function(d) { return yScale(d[1]); })
        );

    // Handmade legend
    svg.append("circle").attr("cx", legendX).attr("cy",30).attr("r", 6).style("fill", "#69b3a2")
    svg.append("circle").attr("cx",legendX).attr("cy",60).attr("r", 6).style("fill", "#404080")
    svg.append("text").attr("x", legendX + 20).attr("y", 30).text(abTestData.variantALabel).style("font-size", "15px").attr("alignment-baseline","middle")
    svg.append("text").attr("x", legendX + 20).attr("y", 60).text(abTestData.variantBLabel).style("font-size", "15px").attr("alignment-baseline","middle")

     // Calculate which variant has a higher conversion rate
    var variant_win_str = compareConversionProbability(
      abTestData.variantALabel,
      abTestData.variantBLabel,
      alphaPosteriorA, betaPosteriorA, alphaPosteriorB, betaPosteriorB);
    
    
    svg.append("text")
      .attr("x", axisPadding)
      .attr("y", probabilityTextHeight)
      .text(variant_win_str)
      .style("font-size", "15px")
      .attr("alignment-baseline","middle")

    // Render probability of variant A beating Variant B.
    doneRendering()
  }
});
