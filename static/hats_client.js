const image_input = document.getElementById('image_input');
const processing_canvas = document.getElementById('processing_canvas');
const ctx = processing_canvas.getContext('2d', { willReadFrequently: true });

const thumbnail_canvas = document.getElementById('thumbnail_canvas');
const thumb_ctx = thumbnail_canvas.getContext('2d');

const thumb_size = thumbnail_canvas.getBoundingClientRect().width;
thumbnail_canvas.width = thumb_size;
thumbnail_canvas.height = thumb_size;

function clearThumbnail() {
    thumb_ctx.fillStyle = '#bbb';
    thumb_ctx.fillRect(0, 0, thumb_size, thumb_size);
    thumb_ctx.beginPath();
    thumb_ctx.arc(thumb_size/2, thumb_size/2, thumb_size/3, 0, 2 * Math.PI);
    thumb_ctx.moveTo(thumb_size/2, thumb_size * 0.95);
    thumb_ctx.lineTo(thumb_size/2, thumb_size * 0.65);
    thumb_ctx.moveTo(thumb_size * 0.95, thumb_size/2);
    thumb_ctx.lineTo(thumb_size * 0.65, thumb_size/2);
    thumb_ctx.moveTo(thumb_size/2, thumb_size * 0.05);
    thumb_ctx.lineTo(thumb_size/2, thumb_size * 0.35);
    thumb_ctx.moveTo(thumb_size * 0.05, thumb_size/2);
    thumb_ctx.lineTo(thumb_size * 0.35, thumb_size/2);
    thumb_ctx.stroke();
}

clearThumbnail();

const detail_button = document.getElementById('detail_button');
const result_element = document.getElementById('tag_result_emoji');

let marker_data = {};
async function loadMarkerData() {
    if ( Object.keys(marker_data).length > 0 ) return marker_data;
    const resp = await fetch('markers.json');
    marker_data = await resp.json();
    return marker_data;
}
loadMarkerData();

let game_token = null;
let session_token = null;
let player_id = null;
async function getSession() {
    const old_game_token = localStorage.getItem('game_token');
    const old_session_token = localStorage.getItem('session_token');
    const url = new URL("../api/get_session", window.location.href);
    url.search = new URLSearchParams({
	game_token: old_game_token,
	session_token: old_session_token
    });
    const resp = await fetch(url);
    const session_data = await resp.json();
    game_token = session_data.game_token
    session_token = session_data.session_token
    player_id = session_data.player

    localStorage.setItem('game_token', game_token);
    localStorage.setItem('session_token', session_token);
}
getSession().then(() => {
    console.log(JSON.stringify({
	game: game_token,
	session: session_token,
	player: player_id
    }, null, 2));
});

// Create the 4x4_50 dictionary by slicing the first 50 codes and setting tau = 4
AR.DICTIONARIES['ARUCO_4X4_50'] = {
    nBits: 16,
    tau: 4,
    codeList: AR.DICTIONARIES['ARUCO_4X4_1000'].codeList.slice(0, 50)
};

// Initialize the detector (adjust dictionaryName to match your markers)
const detector = new AR.Detector({
    dictionaryName: 'ARUCO_4X4_50'
});

var onTagResult = async function (result) {};

image_input.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    loadMarkerData().then(() => {}).catch((err) => console.error("couldn't load marker data:", err));

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = async () => {
	// Downscale large mobile photos (e.g., max width 1280px)
	const MAX_SIZE = 1000;
	const scale = Math.min(1, MAX_SIZE / img.width, );
	const width = img.width * scale;
	const height = img.height * scale;
	processing_canvas.width = width;
	processing_canvas.height = height;

	const center = { "x": width / 2, "y": height / 2 };

	// Draw image to canvas (modern browsers automatically handle EXIF rotation)
	ctx.drawImage(img, 0, 0, width, height);
	URL.revokeObjectURL(objectUrl); // Free up memory

	// Extract pixel data and run detection
	const imageData = ctx.getImageData(0, 0, width, height);
	const markers = detector.detect(imageData);

	console.log(`Found ${markers.length} markers:`, markers);

	markers.forEach((marker) => {
	    const ncorners = marker.corners.length;
	    marker.center = { "x": marker.corners.reduce((sum, corner) => sum + corner.x, 0) / ncorners,
			      "y": marker.corners.reduce((sum, corner) => sum + corner.y, 0) / ncorners };

	    marker.diameter = marker.corners.reduce((sum, corner) =>
		sum + Math.hypot(corner.x - marker.center.x, corner.y - marker.center.y), 0) / ncorners;

	    marker.distance = marker.corners.reduce((sum, corner) =>
		sum + Math.hypot(corner.x - center.x, corner.y - center.y), 0) / ncorners;

	    marker.centrality = marker.diameter / marker.distance;
	});

	// Detect and score pairs in preparation for determining a result
	const valid_markers = markers.filter(marker => marker.id in marker_data);
	const team_markers = valid_markers.filter(marker => marker_data[marker.id].kind === "team");
	const id_markers = valid_markers.filter(marker => marker_data[marker.id].kind !== "team");

	const pairs = [];
	const pair_groups = {};
	team_markers.forEach((team_marker) => {
	    id_markers.forEach((id_marker) => {
		const pair = { "team": team_marker, "id": id_marker };
		pair.name = marker_data[team_marker.id].name + "_" + marker_data[id_marker.id].name;

		pair.distance = Math.hypot(team_marker.center.x - id_marker.center.x,
					   team_marker.center.y - id_marker.center.y);
		pair.proximity = team_marker.diameter * id_marker.diameter / pair.distance ** 2;
		pair.score = pair.proximity * team_marker.centrality * id_marker.centrality;

		// reject pairs that are too far apart to be from the same hat
		// Continue to tune this threshold through field testing and when PDF template is changed
		if (pair.proximity > 0.025) {
		    pairs.push(pair);

		    if (pair.name in pair_groups) {
			pair_groups[pair.name].pairs.push(pair);
		    } else {
			pair_groups[pair.name] = {
			    "name": pair.name,
			    "team": marker_data[team_marker.id],
			    "id": marker_data[id_marker.id],
			    "pairs": [pair]
			};
		    }
		}
	    });
	});

	const pair_group_list = Object.values(pair_groups);
	pair_group_list.forEach((group) => {
	    group.score = group.pairs.reduce((sum, pair) => sum + pair.score, 0);
	});
	pair_group_list.sort((a,b) => b.score - a.score);

	// Draw bounding boxes around all detected markers, winners or otherwise
	valid_markers.forEach((marker) => { drawOutline(ctx, marker, "#0000FF"); });

	// Detect if a winner exists and draw boxes on winner or runners up, and update result indicator
	let winning_pair_groups = [];
	if (pair_group_list.length > 0) {
	    // Don't detect a hit if multiple groups are "tied" for first place (within a factor of 0.25)
	    // Continue to tune this factor through field testing
	    winning_pair_groups = pair_group_list.filter((group) => group.score > pair_group_list[0].score * 0.25);

	    if (winning_pair_groups.length === 1) {
		result_element.innerHTML = winning_pair_groups[0].team.emoji + winning_pair_groups[0].id.emoji;

		winning_pair_groups[0].pairs.forEach((pair) => {
		    [pair.team, pair.id].forEach((marker) => {
			drawOutline(ctx, marker, "#00FF00");
		    });
		});

		await onTagResult({team: winning_pair_groups[0].team.name, id: winning_pair_groups[0].id.name});
	    } else {
		result_element.innerHTML = "❔";

		winning_pair_groups.forEach((group) => {
		    group.pairs.forEach((pair) => {
			[pair.team, pair.id].forEach((marker) => {
			    drawOutline(ctx, marker, "#FF00FF");
			});
		    });
		});
	    }
	} else {
	    result_element.innerHTML = "";
	}

	// Find the bounding box to include in the thumbnail
	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;

        winning_pair_groups.forEach((group) => {
            group.pairs.forEach((pair) => {
                [pair.team, pair.id].forEach((marker) => {
		    for (const { x, y } of marker.corners) {
			if (x < minX) minX = x;
			if (y < minY) minY = y;
			if (x > maxX) maxX = x;
			if (y > maxY) maxY = y;
		    }
                });
            });
        });

	if (Number.isFinite(minX)) {
	    const thumb_pad = 25;
	    minX -= thumb_pad;
	    minY -= thumb_pad;
	    maxX += thumb_pad;
	    maxY += thumb_pad;
	} else {
	    minX = 0;
	    minY = 0;
	    maxX = width;
	    maxY = height;
	}

	const trim = (maxX - minX) - (maxY - minY);
	if (trim > 0) {
	    minY -= trim / 2;
	    maxY += trim / 2
	} else {
	    minX += trim / 2;
	    maxX -= trim / 2
	}

	if (minX < 0) minX = 0;
	if (minY < 0) minY = 0;
	if (maxX > width) maxX = width;
	if (maxY > height) maxY = height;

	const thumb_size = thumbnail_canvas.getBoundingClientRect().width;
	thumbnail_canvas.width = thumb_size;
	thumbnail_canvas.height = thumb_size;

	let minXt = 0;
	let minYt = 0;
	let maxXt = thumb_size;
	let maxYt = thumb_size;

	let t_aspect = (maxX - minX) / (maxY - minY);
	if (t_aspect > 1) {
	    const thumb_trim = thumb_size * (1 - 1/t_aspect) / 2;
	    minYt += thumb_trim;
	    maxYt -= thumb_trim;
	} else {
	    const thumb_trim = thumb_size * (1 - t_aspect) / 2;
	    minXt += thumb_trim;
	    maxXt -= thumb_trim;
	}

	thumb_ctx.fillStyle = '#777';
	thumb_ctx.fillRect(0, 0, thumb_size, thumb_size);
	thumb_ctx.drawImage(processing_canvas,
			    minX, minY, maxX-minX, maxY-minY,
			    minXt, minYt, maxXt-minXt, maxYt-minYt);

	detail_button.disabled = false;
	detail_button.innerHTML = "🔍";

	console.log(JSON.stringify(
	    pair_group_list,
	    ["name", "proximity", "score", "pairs", "team", "id", "centrality"],
	    2
	));
    };

    img.src = objectUrl;
});

function drawOutline(ctx, marker, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    marker.corners.forEach((corner, index) => {
	if (index === 0) ctx.moveTo(corner.x, corner.y);
	else ctx.lineTo(corner.x, corner.y);
    });
    ctx.closePath();
    ctx.stroke();
}
