all: clean images libs

ARUCO2SRC := node_modules/js-aruco2
ARUCO2DST := lib/js-aruco2

.PHONY: clean images libs

images:
	python build_pdfs.py

libs:
	npm install
	mkdir -p ${ARUCO2DST}
	cp ${ARUCO2SRC}/LICENSE.txt ${ARUCO2DST}
	cp ${ARUCO2SRC}/README.md ${ARUCO2DST}
	cp ${ARUCO2SRC}/src/aruco.js ${ARUCO2DST}
	cp ${ARUCO2SRC}/src/cv.js ${ARUCO2DST}
	cp ${ARUCO2SRC}/src/dictionaries/aruco_4x4_1000.js ${ARUCO2DST}

clean:
	rm static/images/*/*
