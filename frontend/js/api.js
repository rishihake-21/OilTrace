const API_BASE_URL = "http://127.0.0.1:8000";


async function analyzeSARImage(
    file,
    north,
    south,
    east,
    west
) {

    if (!file) {
        throw new Error(
            "Please select a SAR image."
        );
    }


    const footprint = {
        north: Number(north),
        south: Number(south),
        east: Number(east),
        west: Number(west)
    };


    if (
        !Number.isFinite(footprint.north) ||
        !Number.isFinite(footprint.south) ||
        !Number.isFinite(footprint.east) ||
        !Number.isFinite(footprint.west)
    ) {

        throw new Error(
            "Please enter all four footprint coordinates."
        );

    }


    if (
        footprint.north <= footprint.south
    ) {

        throw new Error(
            "North must be greater than South."
        );

    }


    if (
        footprint.east <= footprint.west
    ) {

        throw new Error(
            "East must be greater than West."
        );

    }


    const formData = new FormData();


    formData.append(
        "file",
        file
    );


    formData.append(
        "north",
        footprint.north
    );


    formData.append(
        "south",
        footprint.south
    );


    formData.append(
        "east",
        footprint.east
    );


    formData.append(
        "west",
        footprint.west
    );


    const response = await fetch(
        `${API_BASE_URL}/api/analyze`,
        {
            method: "POST",
            body: formData
        }
    );


    if (!response.ok) {

        let message =
            "Analysis request failed.";

        try {

            const errorData =
                await response.json();

            if (errorData.detail) {
                message =
                    errorData.detail;
            }

        } catch {
            // Ignore JSON parsing errors
        }


        throw new Error(
            message
        );

    }


    return await response.json();
}


async function checkBackendHealth() {

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/api/health`
            );

        return response.ok;

    } catch {

        return false;

    }

}